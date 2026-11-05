import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin } from "@/lib/http";
import { sendPendingPush, webPushConfig } from "@/lib/web-push";
import { validPushEndpoint, validPushKeys } from "@/lib/push-rules";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("subscribe"), endpoint: z.string().max(2048), keys: z.object({ p256dh: z.string().max(100), auth: z.string().max(30) }) }),
  z.object({ action: z.enum(["status", "unsubscribe", "test"]), endpoint: z.string().max(2048) }),
]);
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in first." }, { status: 403 });
  const config = webPushConfig();
  return NextResponse.json({ configured: Boolean(config), publicKey: config?.publicKey || null }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in first." }, { status: 403 });
  const text = await request.text(); if (text.length > 8192) return NextResponse.json({ error: "Subscription too large." }, { status: 413 });
  let body: unknown; try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid subscription." }, { status: 400 }); }
  const parsed = schema.safeParse(body); if (!parsed.success || !validPushEndpoint(parsed.data.endpoint)) return NextResponse.json({ error: "Unsupported push subscription." }, { status: 400 });
  const input = parsed.data, endpointHash = createHash("sha256").update(input.endpoint).digest("hex");
  const token = (await cookies()).get("paustik_session")?.value || "";
  const session = await prisma.authSession.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date()) return NextResponse.json({ error: "Sign in again to manage device notifications." }, { status: 403 });
  const own = { endpointHash, userId: user.id, sessionId: session.id };
  if (input.action === "status") return NextResponse.json({ enabled: Boolean(await prisma.webPushDevice.findFirst({ where: own })) });
  if (input.action === "unsubscribe") { await prisma.webPushDevice.deleteMany({ where: own }); return NextResponse.json({ enabled: false }); }
  if (!webPushConfig()) return NextResponse.json({ error: "Push activation is pending. Your in-app inbox still works." }, { status: 503 });
  if (input.action === "test") {
    const device = await prisma.webPushDevice.findFirst({ where: own });
    if (!device) return NextResponse.json({ error: "Enable this device first." }, { status: 409 });
    const accepted = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"push-test:" + user.id},0))`;
      const recent = await tx.notification.findFirst({ where: { userId: user.id, kind: "SYSTEM", title: "Push notification test", createdAt: { gt: new Date(Date.now() - 30000) } } });
      if (recent) return false;
      await tx.notification.create({ data: { userId: user.id, title: "Push notification test", body: "This is your requested Paustik notification test.", kind: "SYSTEM" } });
      return true;
    });
    if (!accepted) return NextResponse.json({ error: "Wait 30 seconds before another test." }, { status: 429 });
    after(() => sendPendingPush([user.id]));
    return NextResponse.json({ requested: true, message: "Test queued. Delivery depends on your browser and device settings." });
  }
  if (input.action !== "subscribe") return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  if (!validPushKeys(input.keys)) return NextResponse.json({ error: "Invalid push encryption keys." }, { status: 400 });
  const count = await prisma.webPushDevice.count({ where: { userId: user.id, session: { revokedAt: null, expiresAt: { gt: new Date() } } } });
  if (count >= 10 && !(await prisma.webPushDevice.findUnique({ where: { endpointHash } }))) return NextResponse.json({ error: "Device limit reached. Sign out of unused devices first." }, { status: 409 });
  const now = new Date();
  await prisma.webPushDevice.upsert({ where: { endpointHash }, create: { userId: user.id, sessionId: session.id, endpointHash, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth }, update: { userId: user.id, sessionId: session.id, p256dh: input.keys.p256dh, auth: input.keys.auth, createdAt: now, lastEventAt: now, lastAttemptAt: null } });
  return NextResponse.json({ enabled: true });
}
