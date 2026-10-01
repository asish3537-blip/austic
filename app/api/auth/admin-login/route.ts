import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/auth-validation";
import { createSession, roleHome } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";

function identifierHash(username: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(`admin-login:${username.toLowerCase()}`).digest("hex");
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your admin username and password." }, { status: 400 }); }
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Enter a valid username and password." }, { status: 400 });

  const username = parsed.data.username.toLowerCase();
  const hash = identifierHash(username);
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);

  try {
    const failures = await prisma.failedLoginAttempt.count({ where: { identifierHash: hash, createdAt: { gte: windowStart } } });
    if (failures >= 8) return NextResponse.json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." }, { status: 429 });

    const user = await prisma.user.findUnique({ where: { username } });
    const passwordMatches = user?.passwordHash ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !passwordMatches) {
      await prisma.failedLoginAttempt.create({ data: { identifierHash: hash } });
      return NextResponse.json({ error: "The username or password is incorrect, or this admin account is unavailable." }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.failedLoginAttempt.deleteMany({ where: { identifierHash: hash } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);
    await createSession(user.id);
    return NextResponse.json({ destination: roleHome({ role: user.role, status: user.status }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Paustik administrator sign-in failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

