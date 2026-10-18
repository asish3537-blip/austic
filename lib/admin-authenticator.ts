import { createHmac } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptAuthenticatorSecret, recoveryCodeHash, verifyTotp } from "@/lib/totp";

export class AdminAuthError extends Error {
  constructor(message: string, public status = 400, public requiresAuthenticator = false) { super(message); }
}

// Count all attempts before checking credentials. Advisory lock prevents parallel guessing.
export async function reserveAdminAttempt(identifier: string, limit = 8) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET_REQUIRED");
  const hash = createHmac("sha256", secret).update(identifier).digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${hash}))::text AS locked`;
    const count = await tx.failedLoginAttempt.count({ where: { identifierHash: hash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } });
    if (count >= limit) throw new AdminAuthError("Too many attempts. Wait 15 minutes and try again.", 429);
    await tx.failedLoginAttempt.create({ data: { identifierHash: hash } });
    return hash;
  });
}

export async function lockAdmin(tx: Prisma.TransactionClient, userId: string) {
  // Every factor mutation and consumption takes this lock before reading current state.
  await tx.$queryRaw`SELECT id FROM paustik_marketplace.users WHERE id = ${userId}::uuid FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId }, include: { adminAuthenticator: true } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") throw new AdminAuthError("This administrator account is unavailable.", 403);
  return user;
}

export async function consumeAdminFactor(tx: Prisma.TransactionClient, user: Awaited<ReturnType<typeof lockAdmin>>, code: string) {
  const factor = user.adminAuthenticator;
  if (!factor?.enabledAt) throw new AdminAuthError("Link your authenticator app first.", 409);
  if (/^\d{6}$/.test(code)) {
    const secret = decryptAuthenticatorSecret(factor.encryptedSecret, user.id);
    const step = verifyTotp(secret, code, factor.lastUsedStep);
    if (step !== null) {
      const consumed = await tx.adminAuthenticator.updateMany({
        where: { userId: user.id, version: factor.version, enabledAt: { not: null }, lastUsedStep: factor.lastUsedStep },
        data: { lastUsedStep: step },
      });
      if (consumed.count === 1) return;
    }
  } else {
    const hash = recoveryCodeHash(code, user.id);
    if (hash) {
      const consumed = await tx.adminRecoveryCode.deleteMany({ where: { userId: user.id, codeHash: hash } });
      if (consumed.count === 1) return;
    }
  }
  throw new AdminAuthError("That authenticator or recovery code is incorrect, expired, or already used. Wait for a fresh code and try again.", 401, true);
}

export async function invalidateAdminSessions(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.update({ where: { id: userId }, data: { adminAuthVersion: { increment: 1 } } });
  await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  return user.adminAuthVersion;
}
