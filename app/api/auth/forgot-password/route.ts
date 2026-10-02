import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeAuthLink, sendAuthEmail } from "@/lib/email";
import { emailSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";
const genericMessage = "If a Pausstik account uses that email, password reset instructions are on the way.";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL) return serviceUnavailable();
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Password reset email is not connected yet. Configure the Pausstik email sender, then request a new link." }, { status: 503 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email address." }, { status: 400 }); }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status === "SUSPENDED" || user.status === "REJECTED") {
      return NextResponse.json({ message: genericMessage });
    }
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
    ]);
    const emailSent = await sendAuthEmail(email, "reset", rawToken, new URL(request.url).origin);
    if (!emailSent) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash, usedAt: null } });
    }
    const resetUrl = process.env.NODE_ENV !== "production" && !emailSent ? makeAuthLink("reset", rawToken) : undefined;
    return NextResponse.json({ message: genericMessage, ...(resetUrl ? { resetUrl } : {}) });
  } catch (error) {
    console.error("Pausstik password reset request failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
