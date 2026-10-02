import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { CANCELLATION_CUTOFF_HOURS, CANCELLATION_OPERATION_FEE_INR, lockWallet, walletBalance } from "@/lib/marketplace-rules";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  const { orderId } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockWallet(tx, user.id);
      const order = await tx.order.findFirst({ where: { id: orderId, customerId: user.id }, include: { payments: true, items: true, subscription: true, mother: { select: { userId: true } } } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status !== "ORDER_PLACED" && order.status !== "CONFIRMED") throw new Error("PREPARATION_STARTED");
      const cutoffAt = new Date(order.scheduledFor.getTime() - CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000);
      const now = new Date();
      if (now > cutoffAt) throw new Error("CUTOFF_PASSED");

      const captured = order.payments.filter((payment) => payment.status === "CAPTURED").reduce((sum, payment) => sum + Number(payment.amount), 0);
      const walletUsed = Number((await tx.walletLedgerEntry.aggregate({ where: { orderId: order.id, direction: "DEBIT" }, _sum: { amount: true } }))._sum.amount ?? 0);
      const eligiblePaidAmount = Math.min(Number(order.totalAmount), captured + walletUsed);
      const credit = Math.max(0, eligiblePaidAmount - CANCELLATION_OPERATION_FEE_INR);
      if (credit > 0) await tx.walletLedgerEntry.create({ data: {
        userId: user.id, orderId: order.id, subscriptionId: order.subscriptionId, direction: "CREDIT", amount: credit,
        reference: "cancel:" + order.id, description: "Wallet credit after timely cancellation (₹5 processing fee deducted)",
        metadata: { paidValue: eligiblePaidAmount, operationFee: CANCELLATION_OPERATION_FEE_INR },
      } });
      // An approved cancellation request is the idempotent audit record. Its refund value
      // reflects actual cash collected; existing wallet spend is separately credited above.
      const cancellation = await tx.cancellationRequest.create({ data: {
        userId: user.id, subscriptionId: order.subscriptionId, orderId: order.id, status: "APPROVED",
        refundAmount: credit, decidedAt: now,
        ruleSnapshot: { cutoffHours: CANCELLATION_CUTOFF_HOURS, operationFeeINR: CANCELLATION_OPERATION_FEE_INR, eligiblePaidValue: eligiblePaidAmount, walletCreditINR: credit, payoutMode: "PAUSSTIK_WALLET" },
      } });
      if (credit > 0) await tx.paymentLedgerEntry.create({ data: {
        orderId: order.id, category: "REFUND", amount: credit, currency: order.currency,
        reference: "wallet-cancellation:" + cancellation.id, metadata: { mode: "wallet-credit", operationFeeINR: CANCELLATION_OPERATION_FEE_INR },
      } });
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: credit > 0 ? (credit >= Number(order.totalAmount) ? "REFUNDED" : "PARTIALLY_REFUNDED") : order.paymentStatus } });
      await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: user.id, status: "CANCELLED", detail: "Customer cancelled at least five hours before delivery. Wallet credit ₹" + credit.toFixed(2) + "; ₹5 processing fee applies only when paid value is refunded." } });
      for (const item of order.items) {
        const snapshot = item.dietarySnapshot && typeof item.dietarySnapshot === "object" && !Array.isArray(item.dietarySnapshot) ? item.dietarySnapshot as Record<string, unknown> : null;
        if (typeof snapshot?.menuId === "string") await tx.menu.updateMany({ where: { id: snapshot.menuId }, data: { stockCount: { increment: item.quantity }, isAvailable: true } });
      }
      if (order.subscriptionId) {
        const remaining = await tx.order.count({ where: { subscriptionId: order.subscriptionId, status: { not: "CANCELLED" } } });
        if (remaining === 0) await tx.subscription.update({ where: { id: order.subscriptionId }, data: { status: "CANCELLED", cancelledAt: now } });
      }
      await tx.notification.createMany({ data: [
        { userId: order.customerId, title: "Meal day cancelled", body: credit > 0 ? "₹" + credit.toFixed(0) + " was added to your Pausstik wallet after the ₹5 processing fee.": "Your day was cancelled. No funds had been collected, so no wallet credit was due.", kind: "ORDER", entityId: order.id },
        { userId: order.mother.userId, title: "Meal day cancelled", body: "Order " + order.orderNumber + " was cancelled before the five-hour cutoff.", kind: "ORDER", entityId: order.id },
      ] });
      return { walletCredit: credit, balance: await walletBalance(tx, user.id), cutoffAt: cutoffAt.toISOString() };
    });
    return NextResponse.json({ cancelled: true, ...result, message: result.walletCredit > 0 ? "Meal day cancelled; eligible paid value less the ₹5 fee is in your wallet." : "Meal day cancelled. No payment had been collected." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (code === "PREPARATION_STARTED") return NextResponse.json({ error: "This meal is already in preparation and can no longer be cancelled online. Contact Pausstik support." }, { status: 409 });
    if (code === "CUTOFF_PASSED") return NextResponse.json({ error: "Cancellation closes five hours before the scheduled delivery." }, { status: 409 });
    if (code === "ALREADY_CANCELLED") return NextResponse.json({ error: "This order day is already cancelled." }, { status: 409 });
    console.error("Pausstik customer cancellation failed.", code || "unknown error");
    return serviceUnavailable();
  }
}
