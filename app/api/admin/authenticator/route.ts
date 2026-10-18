import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { AdminAuthError, consumeAdminFactor, invalidateAdminSessions, lockAdmin, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { authenticatorUri, createAuthenticatorSecret, createRecoveryCodes, decryptAuthenticatorSecret, encryptAuthenticatorSecret, recoveryCodeHash, verifyTotp } from "@/lib/totp";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Pragma": "no-cache" };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("begin"), password: z.string().min(1).max(128) }),
  z.object({ action: z.literal("confirm"), code: z.string().trim().regex(/^\d{6}$/) }),
  z.object({ action: z.enum(["disable", "regenerate"]), password: z.string().min(1).max(128), code: z.string().trim().min(1).max(40) }),
]);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in as an administrator to manage your authenticator." }, { status: 403, headers });
    const factor = await prisma.adminAuthenticator.findUnique({ where: { userId: user.id }, select: { enabledAt: true } });
    const enabled = Boolean(factor?.enabledAt);
    const count = enabled ? await prisma.adminRecoveryCode.count({ where: { userId: user.id } }) : 0;
    return NextResponse.json({ enabled, recoveryCodesRemaining: count }, { headers });
  } catch { return serviceUnavailable(); }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN" || session.status !== "ACTIVE") throw new AdminAuthError("Sign in as an administrator to manage your authenticator.", 403);
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AdminAuthError("Enter your password and the requested authenticator code.");
    const input = parsed.data;
    const attemptHash = await reserveAdminAttempt(`admin-authenticator:${session.id}`);

    const result = await prisma.$transaction(async (tx) => {
      // Coordinate enrollment with the one-time owner recovery transaction.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(704261103)::text AS locked`;
      const user = await lockAdmin(tx, session.id);
      if (user.adminAuthVersion !== session.adminAuthVersion) throw new AdminAuthError("Your account security changed. Sign in again.", 401);
      if ("password" in input && !(await bcrypt.compare(input.password, user.passwordHash))) throw new AdminAuthError("Your current password is incorrect.", 401);
      const factor = user.adminAuthenticator;

      if (input.action === "begin") {
        if (factor?.enabledAt) throw new AdminAuthError("An authenticator is already linked. Use your current code or a recovery code to disable it before linking a replacement.", 409);
        const secret = createAuthenticatorSecret();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const encryptedSecret = encryptAuthenticatorSecret(secret, user.id);
        await tx.adminAuthenticator.upsert({ where: { userId: user.id },
          create: { userId: user.id, encryptedSecret, pendingExpiresAt: expiresAt },
          update: { encryptedSecret, pendingExpiresAt: expiresAt, lastUsedStep: null, version: { increment: 1 } },
        });
        return { action: "begin" as const, secret, email: user.email, expiresAt: expiresAt.toISOString() };
      }

      let recoveryCodes: string[] | undefined;
      let version: number | undefined;
      if (input.action === "confirm") {
        if (!factor || factor.enabledAt || !factor.pendingExpiresAt || factor.pendingExpiresAt <= new Date()) throw new AdminAuthError("This setup has expired or changed. Start authenticator setup again.", 409);
        const step = verifyTotp(decryptAuthenticatorSecret(factor.encryptedSecret, user.id), input.code);
        if (step === null) throw new AdminAuthError("That code is incorrect or expired. Use the current six-digit code in your app.", 401);
        const changed = await tx.adminAuthenticator.updateMany({
          where: { userId: user.id, version: factor.version, enabledAt: null, pendingExpiresAt: { gt: new Date() } },
          data: { enabledAt: new Date(), pendingExpiresAt: null, lastUsedStep: step, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new AdminAuthError("This setup changed. Start again.", 409);
        recoveryCodes = createRecoveryCodes();
        version = await invalidateAdminSessions(tx, user.id);
      } else {
        await consumeAdminFactor(tx, user, input.code);
        if (input.action === "disable") {
          await tx.adminAuthenticator.delete({ where: { userId: user.id } });
          await tx.adminRecoveryCode.deleteMany({ where: { userId: user.id } });
          version = await invalidateAdminSessions(tx, user.id);
        } else {
          recoveryCodes = createRecoveryCodes();
        }
      }
      if (recoveryCodes) {
        await tx.adminRecoveryCode.deleteMany({ where: { userId: user.id } });
        await tx.adminRecoveryCode.createMany({ data: recoveryCodes.map((code) => ({ userId: user.id, codeHash: recoveryCodeHash(code, user.id)! })) });
      }
      await tx.adminActivityLog.create({ data: { adminId: user.id, action: `ADMIN_AUTHENTICATOR_${input.action.toUpperCase()}`, entityType: "USER", entityId: user.id } });
      await tx.failedLoginAttempt.deleteMany({ where: { identifierHash: attemptHash } });
      return { action: input.action, enabled: input.action !== "disable", recoveryCodes, version };
    });

    if (result.action === "begin") {
      const qrCodeDataUrl = await QRCode.toDataURL(authenticatorUri(result.secret, result.email), { errorCorrectionLevel: "M", width: 280, margin: 2 });
      return NextResponse.json({ secret: result.secret, qrCodeDataUrl, expiresAt: result.expiresAt }, { headers });
    }
    if (result.version !== undefined) await createSession(session.id, result.version);
    return NextResponse.json({ enabled: result.enabled, ...(result.recoveryCodes ? { recoveryCodes: result.recoveryCodes } : {}) }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("Pausstik authenticator request failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
