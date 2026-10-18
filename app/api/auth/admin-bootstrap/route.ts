import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { adminBootstrapSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";

// One-time owner recovery. The raw setup code is shared directly with the user;
// only its digest is stored here. It expires on 2026-10-21 UTC and can be used once.
const OWNER_SETUP_CODE_HASH = "b2c6a0e7f77d89306a798141c33f3c59a184dc4d882bfe36f6c5841f7f0d7473";
const OWNER_SETUP_EXPIRES_AT = Date.parse("2026-10-21T00:00:00.000Z");
const OWNER_SETUP_LOCK_ID = 704261103;

function matchesOwnerSetupCode(code: string) {
  if (Date.now() >= OWNER_SETUP_EXPIRES_AT) return false;
  const received = createHash("sha256").update(code).digest();
  const expected = Buffer.from(OWNER_SETUP_CODE_HASH, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function rateLimitKey(request: Request) {
  const ip = request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", process.env.AUTH_SECRET!).update(`admin-owner-bootstrap:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();
  if (Date.now() >= OWNER_SETUP_EXPIRES_AT) return NextResponse.json({ error: "The one-time admin setup link has expired. Contact Pausstik support." }, { status: 410 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the one-time setup code and admin account details." }, { status: 400 }); }
  const parsed = adminBootstrapSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the admin account details." }, { status: 400 });

  const attemptKey = rateLimitKey(request);
  try {
    const recentFailures = await prisma.failedLoginAttempt.count({
      where: { identifierHash: attemptKey, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    if (recentFailures >= 8) return NextResponse.json({ error: "Too many setup attempts. Wait 15 minutes and try again." }, { status: 429 });
    if (!matchesOwnerSetupCode(parsed.data.setupCode)) {
      await prisma.failedLoginAttempt.create({ data: { identifierHash: attemptKey } });
      return NextResponse.json({ error: "That one-time setup code is incorrect." }, { status: 401 });
    }

    const username = parsed.data.username.toLowerCase();
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${OWNER_SETUP_LOCK_ID})::text AS locked`;
      const alreadyUsed = await tx.adminActivityLog.findFirst({
        where: { action: "ADMIN_OWNER_BOOTSTRAP" },
        select: { id: true },
      });
      if (alreadyUsed) throw new Error("OWNER_SETUP_ALREADY_USED");
      const enrolledAdmin = await tx.adminAuthenticator.findFirst({ where: { enabledAt: { not: null } }, select: { userId: true } });
      if (enrolledAdmin) throw new Error("OWNER_SETUP_MFA_PROTECTED");

      const matches = await tx.user.findMany({
        where: { OR: [{ username }, { email }] },
        select: { id: true, role: true },
      });
      if (matches.length > 1 || matches.some((match) => match.role !== "ADMIN")) {
        throw new Error("OWNER_SETUP_ACCOUNT_CONFLICT");
      }

      const currentAdmins = await tx.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      const existingOwner = matches[0];
      const owner = existingOwner
        ? await tx.user.update({
            where: { id: existingOwner.id },
            data: { name: parsed.data.name, username, email, passwordHash, role: "ADMIN", status: "ACTIVE", adminAuthVersion: { increment: 1 } },
            select: { id: true, name: true, email: true, username: true, adminAuthVersion: true },
          })
        : await tx.user.create({
            data: { name: parsed.data.name, username, email, passwordHash, role: "ADMIN", status: "ACTIVE" },
            select: { id: true, name: true, email: true, username: true, adminAuthVersion: true },
          });

      const otherAdminIds = currentAdmins.map((admin) => admin.id).filter((id) => id !== owner.id);
      await tx.authSession.updateMany({ where: { userId: owner.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuthenticator.deleteMany({ where: { userId: owner.id, enabledAt: null } });
      await tx.passwordResetToken.updateMany({ where: { userId: owner.id, usedAt: null }, data: { usedAt: new Date() } });
      if (otherAdminIds.length) {
        await tx.user.updateMany({ where: { id: { in: otherAdminIds } }, data: { status: "SUSPENDED", adminAuthVersion: { increment: 1 } } });
        await tx.authSession.updateMany({
          where: { userId: { in: otherAdminIds }, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.adminActivityLog.create({
        data: {
          adminId: owner.id,
          action: "ADMIN_OWNER_BOOTSTRAP",
          entityType: "USER",
          entityId: owner.id,
          newValue: { username, suspendedAdminIds: otherAdminIds },
        },
      });
      await tx.failedLoginAttempt.deleteMany({ where: { identifierHash: attemptKey } });
      return owner;
    });

    await createSession(result.id, result.adminAuthVersion);
    return NextResponse.json({ created: true, admin: result, destination: "/admin/security?setup=1" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_SETUP_MFA_PROTECTED") {
      return NextResponse.json({ error: "An administrator has already linked an authenticator. Sign in with your authenticator or a saved recovery code. Owner setup cannot override it." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "OWNER_SETUP_ALREADY_USED") {
      return NextResponse.json({ error: "Admin setup has already been completed. Ask an active admin to create or reset accounts." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "OWNER_SETUP_ACCOUNT_CONFLICT") {
      return NextResponse.json({ error: "That username or email belongs to another account. Choose different details and try again." }, { status: 409 });
    }
    console.error("Pausstik admin owner setup failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
