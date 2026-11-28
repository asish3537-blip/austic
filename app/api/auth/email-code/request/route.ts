import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { emailLoginHash, newEmailCode } from "@/lib/easy-sign-in";
import { emailConfig, sendLoginCode } from "@/lib/email";

export const runtime = "nodejs";
const input = z.object({ email: z.string().trim().email().max(254) });
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  if (!process.env.AUTH_SECRET || !process.env.DATABASE_URL || !emailConfig()) return NextResponse.json({ error: "Email codes are temporarily unavailable. Try your password." }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  try {
    const ip = request.headers.get("x-real-ip") || "unknown";
    await reserveAdminAttempt(`email-code-send:ip:${ip}`, 20);
    await reserveAdminAttempt(`email-code-send:${email}`, 4);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.role !== "ADMIN" && user.status !== "SUSPENDED" && user.status !== "REJECTED") {
      const code = newEmailCode();
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"email-code:" + user.id}))::text`;
        await tx.emailLoginCode.deleteMany({ where: { userId: user.id } });
        await tx.emailLoginCode.create({ data: { userId: user.id, tokenHash: emailLoginHash(email, code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
      });
      if (!await sendLoginCode(email, code)) return serviceUnavailable();
    }
    return NextResponse.json({ message: "If this email has an eligible Paustik account, a code is on its way. Check spam too. It expires in 10 minutes." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return serviceUnavailable();
  }
}
