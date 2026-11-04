import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
const schema = z.object({ mealScore: z.number().int().min(1).max(5), deliveryScore: z.number().int().min(1).max(5), foodComment: z.string().trim().max(1000).default(""), deliveryComment: z.string().trim().max(1000).default("") });
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser(); if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in as the customer who placed this order." }, { status: 403 });
  const orderId = (await params).orderId; if (!z.string().uuid().safeParse(orderId).success) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const input = schema.safeParse(await request.json().catch(() => null)); if (!input.success) return NextResponse.json({ error: "Give food and delivery a score from 1 to 5. Comments can contain up to 1,000 characters each." }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM paustik_marketplace.orders WHERE id=${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: orderId, customerId: user.id }, include: { mother: { select: { userId: true } }, delivery: { select: { agent: { select: { userId: true } } } }, items: { take: 1, select: { mealId: true } } } });
      if (!order) throw new Error("NOT_FOUND"); if (order.status !== "DELIVERED") throw new Error("NOT_DELIVERED");
      const data = input.data; const courier = order.delivery?.agent?.userId;
      await tx.$queryRaw`SELECT id FROM paustik_marketplace.mother_profiles WHERE user_id=${order.mother.userId}::uuid FOR UPDATE`;
      if (courier) await tx.$queryRaw`SELECT id FROM paustik_marketplace.delivery_agent_profiles WHERE user_id=${courier}::uuid FOR UPDATE`;
      const food = { mealScore: data.mealScore, deliveryScore: courier ? null : data.deliveryScore, comment: "Food: " + data.foodComment + (!courier ? "\nDelivery service: " + data.deliveryComment : "") };
      await tx.rating.upsert({ where: { orderId_authorId_subjectId: { orderId, authorId: user.id, subjectId: order.mother.userId } }, create: { orderId, authorId: user.id, subjectId: order.mother.userId, mealId: order.items[0]?.mealId, ...food }, update: food });
      if (courier) await tx.rating.upsert({ where: { orderId_authorId_subjectId: { orderId, authorId: user.id, subjectId: courier } }, create: { orderId, authorId: user.id, subjectId: courier, deliveryScore: data.deliveryScore, comment: data.deliveryComment }, update: { deliveryScore: data.deliveryScore, comment: data.deliveryComment } });
      const foodAverage = await tx.rating.aggregate({ where: { subjectId: order.mother.userId, mealScore: { not: null } }, _avg: { mealScore: true } });
      await tx.motherProfile.update({ where: { userId: order.mother.userId }, data: { rating: foodAverage._avg.mealScore ?? 0 } });
      if (courier) { const deliveryAverage = await tx.rating.aggregate({ where: { subjectId: courier, deliveryScore: { not: null } }, _avg: { deliveryScore: true } }); await tx.deliveryAgentProfile.update({ where: { userId: courier }, data: { rating: deliveryAverage._avg.deliveryScore ?? 0 } }); }
    });
    return NextResponse.json({ saved: true, message: "Thank you. Your food and delivery feedback has been saved." });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (e instanceof Error && e.message === "NOT_DELIVERED") return NextResponse.json({ error: "Feedback opens after the order is delivered." }, { status: 409 });
    console.error("Paustik feedback could not save.", e instanceof Error ? e.name : "unknown"); return serviceUnavailable();
  }
}
