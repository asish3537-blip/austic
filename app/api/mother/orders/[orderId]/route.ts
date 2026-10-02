import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const statusSchema = z.object({ status: z.enum(["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose the next order status." }, { status: 400 }); }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });
  const { orderId } = await context.params;
  try {
    const mother = await prisma.motherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!mother) return NextResponse.json({ error: "Mother profile not found." }, { status: 404 });
    const order = await prisma.order.findFirst({ where: { id: orderId, motherId: mother.id }, include: { customer: { select: { id: true } }, items: true } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const transitions: Record<string, string[]> = {
      ORDER_PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
    };
    if (!transitions[order.status]?.includes(parsed.data.status)) {
      return NextResponse.json({ error: "That order can no longer move to the selected status." }, { status: 409 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status === "CANCELLED") {
        for (const item of order.items) {
          await tx.menu.updateMany({
            where: { kitchenId: order.kitchenId, mealId: item.mealId, serviceDate: order.scheduledFor },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }
      const next = await tx.order.update({ where: { id: order.id }, data: { status: parsed.data.status } });
      await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: user.id, status: parsed.data.status, detail: "Kitchen updated order status." } });
      if (parsed.data.status === "READY_FOR_PICKUP") {
        await tx.delivery.upsert({
          where: { orderId: order.id },
          create: { orderId: order.id, status: "ASSIGNED", trackingReference: "PS-" + randomBytes(5).toString("hex").toUpperCase() },
          update: {},
        });
      }
      await tx.notification.create({
        data: { userId: order.customerId, title: "Order " + parsed.data.status.toLowerCase().replaceAll("_", " "), body: "Your kitchen updated order " + order.orderNumber + ".", kind: "ORDER", entityId: order.id },
      });
      return next;
    });
    return NextResponse.json({ updated: true, status: updated.status });
  } catch (error) {
    console.error("Pausstik kitchen order update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
