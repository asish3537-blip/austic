import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendAuthEmail } from "@/lib/email";
import { emailSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";

export const runtime = "nodejs";
const genericMessage = "If a Pausstik account uses that email and can receive messages, check your inbox for password reset instructions. If no email arrives, check spam and try again. An earlier reset link stays valid until a replacement is sent or your password is changed.";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Password reset email is not connected yet. Configure the Pausstik email sender, then request a new link." }, { status: 503 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email address." }, { status: 400 }); }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    // Reserve durable attempts before account lookup so unknown accounts have the same limits.
    await reserveAdminAttempt(`password-reset:ip:${ip}`, 20);
    await reserveAdminAttempt(`password-reset:email:${email}`, 4);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status === "SUSPENDED" || user.status === "REJECTED") {
      return NextResponse.json({ message: genericMessage });
    }
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const issued = await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      select: { createdAt: true },
    });
    const emailSent = await sendAuthEmail(email, "reset", rawToken, new URL(request.url).origin).catch(() => false);
    if (!emailSent) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash, usedAt: null } });
      console.error("Pausstik password reset email was not accepted for delivery.");
    } else {
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, tokenHash: { not: tokenHash }, usedAt: null, createdAt: { lt: issued.createdAt } },
        data: { usedAt: new Date() },
      });
    }
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Retry-After": "900" } });
    }
    console.error("Pausstik password reset request failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
