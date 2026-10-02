import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, roleHome } from "@/lib/auth";
import { emailPasswordLoginSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("Pausstik-unknown-account-only", 12);

function identifierHash(email: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(`email-password-login:${email}`).digest("hex");
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  const parsed = emailPasswordLoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const hash = identifierHash(email);
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  try {
    const failures = await prisma.failedLoginAttempt.count({ where: { identifierHash: hash, createdAt: { gte: windowStart } } });
    if (failures >= 8) return NextResponse.json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." }, { status: 429 });

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
    if (!user || user.role === "ADMIN" || user.status === "SUSPENDED" || user.status === "REJECTED" || !passwordMatches) {
      await prisma.failedLoginAttempt.create({ data: { identifierHash: hash } });
      return NextResponse.json({ error: "The email or password is incorrect, or this account is unavailable." }, { status: 401 });
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json({ error: "Verify the email address on your account before signing in. Request a fresh link from phone sign-in." }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.failedLoginAttempt.deleteMany({ where: { identifierHash: hash } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);
    await createSession(user.id);
    return NextResponse.json({ destination: roleHome({ role: user.role, status: user.status }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Pausstik email and password sign-in failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
