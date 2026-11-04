import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/auth-validation";
import { isEmailConfigured, sendAuthEmail } from "@/lib/email";
import { rejectCrossOrigin } from "@/lib/http";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";

const message = "If this is the configured owner email, check your inbox and spam folder for an account setup link.";
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request); if (originError) return originError;
  const owner = process.env.PAUSTIK_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || !isEmailConfigured()) return NextResponse.json({ error: "Owner email setup is temporarily unavailable." }, { status: 503 });
  const input = emailSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter your administrator email." }, { status: 400 });
  try {
    const email = input.data.email.toLowerCase();
    const ip = request.headers.get("x-real-ip") || "unknown";
    await reserveAdminAttempt("owner-email:ip:" + ip, 10);
    await reserveAdminAttempt("owner-email:email:" + email, 3);
    if (email !== owner) return NextResponse.json({ message });
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    const userId = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"owner:" + owner}, 0))`;
      let user = await tx.user.findUnique({ where: { email } });
      if (user && (user.role !== "ADMIN" || ["SUSPENDED", "REJECTED"].includes(user.status))) {
        const approved = process.env.PAUSTIK_OWNER_RESTORE_EMAIL?.trim().toLowerCase() === owner;
        const restored = await tx.adminActivityLog.findFirst({ where: { entityId: user.id, action: "APPROVED_OWNER_RESTORATION" } });
        if (!approved || restored) return null;
        const now = new Date();
        const previousValue = { role: user.role, status: user.status };
        user = await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN", status: "PENDING", passwordHash, emailVerifiedAt: null, adminAuthVersion: { increment: 1 } } });
        await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
        await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "APPROVED_OWNER_RESTORATION", entityType: "USER", entityId: user.id, previousValue, newValue: { role: "ADMIN", status: "PENDING" } } });
      }
      if (!user) user = await tx.user.create({ data: { email, name: "Paustik owner", passwordHash, role: "ADMIN", status: "PENDING" } });
      await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3600000) } });
      return user.id;
    });
    if (userId) {
      const sent = await sendAuthEmail(email, "reset", token, new URL(request.url).origin);
      if (!sent) {
        await prisma.passwordResetToken.deleteMany({ where: { userId, tokenHash: hash, usedAt: null } });
        console.error("Paustik owner setup email was not accepted.");
      } else console.info("Paustik owner setup email accepted by provider.");
    } else console.warn("Paustik owner setup requires account role review.");
    return NextResponse.json({ message }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Paustik owner email setup failed.", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not request the setup email. Please try again." }, { status: 503 });
  }
}

