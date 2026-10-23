import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/auth-validation";
import { isEmailConfigured, makeAuthLink, sendAuthEmail } from "@/lib/email";
import { rejectCrossOrigin } from "@/lib/http";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";

export const runtime = "nodejs";

const genericMessage = "If an unverified Pausstik account uses that email, check your inbox for a verification link. If no email arrives, check spam and try again in two minutes. You can still use an earlier link until a replacement is sent.";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();
  if (!localAuth && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) {
    return NextResponse.json({ error: "Account services are temporarily unavailable. Please try again later." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Enter the email address for your Pausstik account." }, { status: 400 });
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
      const emailSent = await sendAuthEmail(email, "verify", token, new URL(request.url).origin);
      const verificationUrl = !emailSent ? makeAuthLink("verify", token, new URL(request.url).origin) : undefined;
      return NextResponse.json({
        message: emailSent ? genericMessage : "Email delivery is not configured in local mode. Use this one-time verification link:",
        ...(verificationUrl ? { verificationUrl } : {}),
      });
    } catch (error) {
      console.error("Pausstik local verification resend failed.", error instanceof Error ? error.name : "unknown error");
      return NextResponse.json({ error: "Could not create a local verification link. Please try again." }, { status: 503 });
    }
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Pausstik email delivery is not configured yet. The team must finish email setup before accounts can be verified." }, { status: 503 });
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await reserveAdminAttempt(`email-verification:ip:${ip}`, 20);
    await reserveAdminAttempt(`email-verification:email:${email}`, 4);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
    if (!user || user.emailVerifiedAt) return NextResponse.json({ message: genericMessage });

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - 2 * 60 * 1000);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const issued = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM paustik_marketplace.users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const recentToken = await tx.emailVerificationToken.findFirst({
        where: { userId: user.id, usedAt: null, createdAt: { gt: cooldownStart } },
        select: { id: true },
      });
      if (recentToken) return null;
      return tx.emailVerificationToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        select: { createdAt: true },
      });
    });
    if (!issued) return NextResponse.json({ message: genericMessage });

    const emailSent = await sendAuthEmail(email, "verify", token, new URL(request.url).origin).catch(() => false);
    if (!emailSent) {
      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, tokenHash, usedAt: null } });
      console.error("Pausstik verification email was not accepted for delivery.");
    } else {
      // Never invalidate a working link before its replacement is accepted for delivery.
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, tokenHash: { not: tokenHash }, usedAt: null, createdAt: { lt: issued.createdAt } },
        data: { usedAt: new Date() },
      });
    }
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Retry-After": "900" } });
    }
    console.error("Pausstik verification resend failed.", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Could not resend the verification email. Please try again later." }, { status: 503 });
  }
}
