import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/auth-validation";
import { createSession } from "@/lib/auth";
import { AdminAuthError, consumeAdminFactor, lockAdmin, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your admin username and password." }, { status: 400 }); }
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your sign-in details." }, { status: 400 });

  try {
    const username = parsed.data.username.toLowerCase();
    const attemptHash = await reserveAdminAttempt(`admin-login:${username}`);
    const user = await prisma.user.findUnique({ where: { username } });
    const matches = user?.passwordHash ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !matches) throw new AdminAuthError("The username or password is incorrect, or this admin account is unavailable.", 401);

    const result = await prisma.$transaction(async (tx) => {
      const current = await lockAdmin(tx, user.id);
      if (current.passwordHash !== user.passwordHash || current.adminAuthVersion !== user.adminAuthVersion) throw new AdminAuthError("Your account security changed. Sign in again.", 409);
      const enabled = Boolean(current.adminAuthenticator?.enabledAt);
      if (enabled) {
        if (!parsed.data.authenticatorCode) throw new AdminAuthError("Enter the six-digit code from your authenticator app, or a saved recovery code.", 403, true);
        await consumeAdminFactor(tx, current, parsed.data.authenticatorCode);
      }
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await tx.failedLoginAttempt.deleteMany({ where: { identifierHash: attemptHash } });
      await tx.adminActivityLog.create({ data: { adminId: user.id, action: "ADMIN_SIGN_IN", entityType: "USER", entityId: user.id, newValue: { authenticator: enabled } } });
      return { version: current.adminAuthVersion, enabled };
    });
    await createSession(user.id, result.version);
    return NextResponse.json({ destination: result.enabled ? "/admin/dashboard" : "/admin/security?setup=1" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message, requiresAuthenticator: error.requiresAuthenticator }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    console.error("Pausstik administrator sign-in failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
