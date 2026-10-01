import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPhoneOtpConfigured, normalizePhoneNumber, sendPhoneOtp } from "@/lib/phone-otp";
import { phoneLookupCandidates } from "@/lib/phone-number";
import { otpRequestSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin } from "@/lib/http";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { attachDemoOtpCookie, createDemoOtp, isDemoAuthEnabled } from "@/lib/demo-auth";

export const runtime = "nodejs";

function phoneOtpUnavailable() {
  return NextResponse.json({ error: "Phone verification is not connected yet. Paustik needs its SMS verification service configured before it can send codes." }, { status: 503 });
}

function hashIdentifier(value: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(value).digest("hex");
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();
  const demoAuth = !localAuth && isDemoAuthEnabled();
  if (!localAuth && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) return phoneOtpUnavailable();
  if (!localAuth && !demoAuth && !isPhoneOtpConfigured()) return phoneOtpUnavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your phone number." }, { status: 400 }); }
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const phone = normalizePhoneNumber(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number with your country code. Indian numbers can use 10 digits or +91." }, { status: 400 });

  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      const result = local.issueLocalPhoneCode(phone);
      if (!result.code) {
        return NextResponse.json({ error: `Please wait ${result.retryAfterSeconds} seconds before requesting another local code.` }, { status: 429 });
      }
      return NextResponse.json({
        sent: true,
        developmentCode: result.code,
        message: "Local sign-in is enabled because no hosted database is configured. Use the one-time code shown below.",
      });
    } catch (error) {
      console.error("Paustik local phone code could not be created.", error instanceof Error ? error.name : "unknown error");
      return phoneOtpUnavailable();
    }
  }

  const candidates = phoneLookupCandidates(parsed.data.phone, phone);
  const identifierHash = hashIdentifier(`phone-otp-request:${parsed.data.purpose}:${phone}`);
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = ip ? hashIdentifier(`phone-otp-ip:${ip}`) : null;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const user = await prisma.user.findFirst({ where: { phone: { in: candidates } }, select: { id: true, status: true, role: true } });
    if (parsed.data.purpose === "signup" && user) {
      return NextResponse.json({ error: "This phone number already has a Paustik account. Sign in with a phone code instead." }, { status: 409 });
    }

    // Keep sign-in responses the same for known and unknown numbers.
    if (parsed.data.purpose === "login" && (!user || user.role === "ADMIN" || user.status === "SUSPENDED" || user.status === "REJECTED")) {
      return NextResponse.json({ sent: true, message: "If a Paustik account uses this number, a sign-in code has been sent." });
    }

    const phoneAttempts = await prisma.failedLoginAttempt.count({ where: { identifierHash, createdAt: { gte: windowStart } } });
    if (phoneAttempts >= 4) return NextResponse.json({ error: "Too many code requests. Wait an hour before requesting another." }, { status: 429 });
    if (ipHash) {
      const ipAttempts = await prisma.failedLoginAttempt.count({ where: { identifierHash: ipHash, createdAt: { gte: windowStart } } });
      if (ipAttempts >= 20) return NextResponse.json({ error: "Too many code requests from this connection. Try again later." }, { status: 429 });
    }

    await prisma.failedLoginAttempt.createMany({
      data: [{ identifierHash }, ...(ipHash ? [{ identifierHash: ipHash }] : [])],
    });
    if (demoAuth) {
      if (parsed.data.purpose === "login" && (!user || user.role === "ADMIN")) {
        return NextResponse.json({ sent: true, message: "If a Paustik account uses this number, an in-app demo code is ready." }, { headers: { "Cache-Control": "no-store" } });
      }
      const challenge = createDemoOtp(phone, parsed.data.purpose);
      const response = NextResponse.json({
        sent: true,
        developmentCode: challenge.code,
        message: "Temporary demo sign-in: no SMS or email was sent. Use the code shown here; phone ownership is not verified in demo mode.",
      }, { headers: { "Cache-Control": "no-store" } });
      attachDemoOtpCookie(response, challenge.token);
      return response;
    }
    await sendPhoneOtp(phone);
    return NextResponse.json({
      sent: true,
      message: parsed.data.purpose === "signup"
        ? "We sent a 6-digit code to your phone. It expires shortly."
        : "If a Paustik account uses this number, a sign-in code has been sent.",
    });
  } catch (error) {
    console.error("Paustik phone verification request failed.", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Paustik could not send a code right now. Check the number and try again shortly." }, { status: 503 });
  }
}

