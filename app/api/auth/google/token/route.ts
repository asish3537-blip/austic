import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, roleHome } from "@/lib/auth";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { googleCanLinkEmail, googleClientId } from "@/lib/easy-sign-in";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";
const client = new OAuth2Client();
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  const clientId = googleClientId();
  if (!clientId || !process.env.DATABASE_URL || !process.env.AUTH_SECRET) return serviceUnavailable();
  const input = z.object({ credential: z.string().min(100).max(10000) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Google sign-in could not be verified." }, { status: 400 });
  const jar = await cookies(), nonce = jar.get("paustik_google_nonce")?.value;
  jar.delete("paustik_google_nonce");
  if (!nonce) return NextResponse.json({ error: "Sign-in expired. Choose Google again." }, { status: 401 });
  try {
    await reserveAdminAttempt(`google-login:ip:${request.headers.get("x-real-ip") || "unknown"}`, 30);
    let payload;
    try { payload = (await client.verifyIdToken({ idToken: input.data.credential, audience: clientId })).getPayload(); }
    catch { return NextResponse.json({ error: "Google sign-in could not be verified. Try again." }, { status: 401 }); }
    if (!payload || payload.nonce !== nonce || !payload.email_verified || !payload.email || !payload.sub) return NextResponse.json({ error: "Google sign-in could not be verified." }, { status: 401 });
    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleSubject: payload.sub } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.role === "ADMIN" || existing.googleSubject || !googleCanLinkEmail(email, payload.hd)) return NextResponse.json({ error: "Use your existing email sign-in for this account." }, { status: 403 });
        const linked = await prisma.user.updateMany({ where: { id: existing.id, googleSubject: null, role: { not: "ADMIN" }, status: { notIn: ["SUSPENDED", "REJECTED"] } }, data: { googleSubject: payload.sub, emailVerifiedAt: new Date() } });
        if (linked.count !== 1) return NextResponse.json({ error: "Use email sign-in for this account." }, { status: 403 });
        user = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        user = await prisma.user.create({ data: { email, name: payload.name?.slice(0, 100) || email.split("@")[0], googleSubject: payload.sub, passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 12), role: "CUSTOMER", status: "ACTIVE", emailVerifiedAt: new Date(), customerProfile: { create: {} } } });
      }
    }
    if (user.role === "ADMIN" || ["SUSPENDED", "REJECTED"].includes(user.status)) return NextResponse.json({ error: "This account is unavailable. Contact support." }, { status: 403 });
    await createSession(user.id);
    return NextResponse.json({ destination: roleHome(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return serviceUnavailable();
  }
}
