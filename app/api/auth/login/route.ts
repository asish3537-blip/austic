import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPhoneOtp, isPhoneOtpConfigured, normalizePhoneNumber } from "@/lib/phone-otp";
import { phoneLookupCandidates } from "@/lib/phone-number";
import { createSession, roleHome } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { loginSchema } from "@/lib/auth-validation";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { clearDemoOtpCookie, isDemoAuthEnabled, verifyDemoOtp } from "@/lib/demo-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();
  const demoAuth = !localAuth && isDemoAuthEnabled();
  if (!localAuth && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) return serviceUnavailable();
  if (!localAuth && !demoAuth && !isPhoneOtpConfigured()) {
    return NextResponse.json({ error: "Phone sign-in is not connected yet. Paustik needs its SMS verification service configured." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your phone number and verification code." }, { status: 400 }); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Enter a valid phone number and 6-digit code." }, { status: 400 });

  const phone = normalizePhoneNumber(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number with your country code. Indian numbers can use 10 digits or +91." }, { status: 400 });

  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      const approved = local.verifyLocalPhoneCode(phone, parsed.data.otp);
      const user = local.findLocalUserByPhone(phoneLookupCandidates(parsed.data.phone, phone));
      if (!approved || !user || user.status === "SUSPENDED" || user.status === "REJECTED") {
        return NextResponse.json({ error: "The local code is incorrect or expired, or this account is unavailable." }, { status: 401 });
      }
      local.touchLocalUser(user.id);
      await createSession(user.id);
      return NextResponse.json({ destination: "/account/local-demo" });
    } catch (error) {
      console.error("Paustik local phone sign-in failed.", error instanceof Error ? error.name : "unknown error");
      return serviceUnavailable();
    }
  }

  const identifierHash = createHmac("sha256", process.env.AUTH_SECRET!).update(`phone-otp-check:${phone}`).digest("hex");
  try {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const failedCount = await prisma.failedLoginAttempt.count({ where: { identifierHash, createdAt: { gte: windowStart } } });
    if (failedCount >= 8) return NextResponse.json({ error: "Too many code attempts. Request a new code and try again later." }, { status: 429 });

    const user = await prisma.user.findFirst({ where: { phone: { in: phoneLookupCandidates(parsed.data.phone, phone) } } });
    if (!user || user.role === "ADMIN" || user.status === "SUSPENDED" || user.status === "REJECTED") {
      return NextResponse.json({ error: "The code is incorrect or expired, or this account is unavailable." }, { status: 401 });
    }

    const approved = demoAuth
      ? verifyDemoOtp(request, phone, "login", parsed.data.otp)
      : await checkPhoneOtp(phone, parsed.data.otp);
    if (!approved) {
      await prisma.failedLoginAttempt.create({ data: { identifierHash } });
      return NextResponse.json({ error: "That code is incorrect or expired. Request a new code and try again." }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.failedLoginAttempt.deleteMany({ where: { identifierHash } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);
    await createSession(user.id);
    const response = NextResponse.json({ destination: roleHome({ role: user.role, status: user.status }) }, { headers: { "Cache-Control": "no-store" } });
    if (demoAuth) clearDemoOtpCookie(response);
    return response;
  } catch (error) {
    console.error("Paustik phone sign-in failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

