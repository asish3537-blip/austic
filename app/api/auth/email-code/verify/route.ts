import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, roleHome } from "@/lib/auth";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { emailLoginHash } from "@/lib/easy-sign-in";

export const runtime = "nodejs";
const input = z.object({ email: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  if (!process.env.AUTH_SECRET || !process.env.DATABASE_URL) return serviceUnavailable();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and six-digit code." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  try {
    await reserveAdminAttempt(`email-code-check:ip:${request.headers.get("x-real-ip") || "unknown"}`, 30);
    await reserveAdminAttempt(`email-code-check:${email}`, 6);
    const user = await prisma.$transaction(async tx => {
      const challenge = await tx.emailLoginCode.findUnique({ where: { tokenHash: emailLoginHash(email, parsed.data.code) }, include: { user: true } });
      if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date() || challenge.user.email !== email || challenge.user.role === "ADMIN" || ["SUSPENDED", "REJECTED"].includes(challenge.user.status)) return null;
      const consumed = await tx.emailLoginCode.updateMany({ where: { id: challenge.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) return null;
      return tx.user.update({ where: { id: challenge.userId }, data: { emailVerifiedAt: challenge.user.emailVerifiedAt || new Date(), lastLoginAt: new Date() } });
    });
    if (!user) return NextResponse.json({ error: "That code is incorrect, expired, or already used. Request a new code." }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ destination: roleHome(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return serviceUnavailable();
  }
}
