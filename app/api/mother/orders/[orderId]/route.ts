import {restoreUnpreparedCapacity} from "@/lib/restore-capacity";
import { scheduleCourierOffers } from "@/lib/courier-offers";
import { scheduleEntityPush } from "@/lib/web-push";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { lockWallet } from "@/lib/marketplace-rules";
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
      await lockWallet(tx, order.customerId);
      const live = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
      if (!transitions[live.status]?.includes(parsed.data.status)) throw new Error("ORDER_CHANGED");
      if (parsed.data.status === "CANCELLED" && live.payments.some(payment => payment.status === "CAPTURED" || payment.provider === "razorpay")) throw new Error("PAYMENT_REVIEW_REQUIRED");
      let kitchenWalletRefund=0;
      if (parsed.data.status === "CANCELLED") {
        if(live.status!=="PREPARING")await restoreUnpreparedCapacity(tx,order.items);
        const spent=Number((await tx.walletLedgerEntry.aggregate({where:{orderId:order.id,direction:"DEBIT"},_sum:{amount:true}}))._sum.amount??0);
        kitchenWalletRefund=spent;
        if(spent>0)await tx.walletLedgerEntry.create({data:{userId:order.customerId,orderId:order.id,direction:"CREDIT",amount:spent,reference:"kitchen-cancel:"+order.id,description:"Kitchen cancelled; full wallet spend returned, no customer processing fee"}});
      }
      const next = await tx.order.update({ where: { id: order.id }, data: { status: parsed.data.status, ...(kitchenWalletRefund>0?{paymentStatus:"REFUNDED"}:{}) } });
      await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: user.id, status: parsed.data.status, detail: "Kitchen updated order status."+(kitchenWalletRefund>0?" Full wallet credit ₹"+kitchenWalletRefund.toFixed(2)+" returned without a customer fee.":"") } });
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
    scheduleEntityPush([updated.id]);
    scheduleCourierOffers([updated.id]);
    return NextResponse.json({ updated: true, status: updated.status });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_REVIEW_REQUIRED") return NextResponse.json({ error: "This order has a payment or an open checkout. Contact operations for cancellation and refund review." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_CHANGED") return NextResponse.json({ error: "The order changed. Refresh the kitchen queue." }, { status: 409 });
    console.error("Paustik kitchen order update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
