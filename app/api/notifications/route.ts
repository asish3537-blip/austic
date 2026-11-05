import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin } from "@/lib/http";
import { sendPendingPush } from "@/lib/web-push";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getCurrentUser(); if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in first." }, { status: 403 });
  const [items, unread] = await Promise.all([prisma.notification.findMany({ where: { userId: user.id, kind: { not: "DEMO" } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, body: true, kind: true, createdAt: true, readAt: true } }), prisma.notification.count({ where: { userId: user.id, readAt: null, kind: { not: "DEMO" } } })]);
  after(() => sendPendingPush([user.id]));
  return NextResponse.json({ items, unread }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser(); if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in first." }, { status: 403 });
  const body = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).safeParse(await request.json().catch(() => null));
  if (!body.success || (!body.data.id && body.data.all !== true)) return NextResponse.json({ error: "Choose a notification." }, { status: 400 });
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(body.data.all ? {} : { id: body.data.id }) }, data: { readAt: new Date() } });
  return NextResponse.json({ saved: true });
}
