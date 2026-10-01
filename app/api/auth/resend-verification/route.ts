import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/auth-validation";
import { makeAuthLink, sendAuthEmail } from "@/lib/email";
import { rejectCrossOrigin } from "@/lib/http";
import { isLocalAuthMode } from "@/lib/local-auth-mode";

export const runtime = "nodejs";

const genericMessage = "If an unverified Paustik account uses that email, a fresh verification link has been sent.";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();
  if (!localAuth && !process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Account services are temporarily unavailable. Please try again later." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Enter the email address for your Paustik account." }, { status: 400 });
  }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      const email = parsed.data.email.toLowerCase();
      const user = local.findLocalUserByEmail(email);
      if (!user || user.emailVerifiedAt) return NextResponse.json({ message: genericMessage });

      const now = new Date();
      if (local.hasRecentLocalEmailToken(user.id, new Date(now.getTime() - 2 * 60 * 1000))) {
        return NextResponse.json({ message: "A verification link was requested recently. Use the link from the last request." });
      }

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      local.createLocalEmailToken(user.id, tokenHash);
      const emailSent = await sendAuthEmail(email, "verify", token);
      const verificationUrl = !emailSent ? makeAuthLink("verify", token, new URL(request.url).origin) : undefined;
      return NextResponse.json({
        message: emailSent ? genericMessage : "Email delivery is not configured in local mode. Use this one-time verification link:",
        ...(verificationUrl ? { verificationUrl } : {}),
      });
    } catch (error) {
      console.error("Paustik local verification resend failed.", error instanceof Error ? error.name : "unknown error");
      return NextResponse.json({ error: "Could not create a local verification link. Please try again." }, { status: 503 });
    }
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Paustik email delivery is not configured yet. The team must finish email setup before accounts can be verified." }, { status: 503 });
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
    if (!user || user.emailVerifiedAt) return NextResponse.json({ message: genericMessage });

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - 2 * 60 * 1000);
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, usedAt: null, createdAt: { gt: cooldownStart } },
      select: { id: true },
    });
    if (recentToken) {
      return NextResponse.json({ message: "A verification link was requested recently. Check your inbox, then wait two minutes before requesting another." });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.emailVerificationToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      });
    });

    const emailSent = await sendAuthEmail(email, "verify", token);
    if (!emailSent) {
      return NextResponse.json({ error: "Paustik could not send the verification email. Please try again later." }, { status: 503 });
    }
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    console.error("Paustik verification resend failed.", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Could not resend the verification email. Please try again later." }, { status: 503 });
  }
}
