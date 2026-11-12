import { prisma } from "@/lib/prisma";
import { lockWallet } from "@/lib/marketplace-rules";
import { lockCourier } from "@/lib/delivery-batches";
import { restoreUnpreparedCapacity } from "@/lib/restore-capacity";
import { scheduleEntityPush } from "@/lib/web-push";

export const OVERDUE_AFTER_MINUTES = 60;
export async function expireOverdueOrders(customerId?: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - OVERDUE_AFTER_MINUTES * 60_000);
  const candidates = await prisma.order.findMany({ where: { ...(customerId ? { customerId } : {}), orderNumber: { not: { startsWith: "TEST-LIFE-" } }, status: { notIn: ["DELIVERED", "CANCELLED", "FAILED"] }, scheduledFor: { lte: cutoff } }, select: { id: true, customerId: true }, orderBy: { scheduledFor: "asc" }, take: 50 });
  const cancelled: string[] = [];
  for (const candidate of candidates) {
    const changed = await prisma.$transaction(async tx => {
      await lockWallet(tx, candidate.customerId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: candidate.id }, include: { delivery: { include: { agent: true } }, mother: true, payments: true, items: true } });
      if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status) || order.scheduledFor > cutoff) return false;
      if (order.delivery?.agentId) await lockCourier(tx, order.delivery.agentId);
      const walletSpent = Number((await tx.walletLedgerEntry.aggregate({ where: { orderId: order.id, direction: "DEBIT" }, _sum: { amount: true } }))._sum.amount ?? 0);
      const alreadyCredited = Number((await tx.walletLedgerEntry.aggregate({ where: { orderId: order.id, direction: "CREDIT" }, _sum: { amount: true } }))._sum.amount ?? 0);
      const captured = order.payments.filter(payment => ["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)).reduce((sum, payment) => sum + Number(payment.amount), 0);
      const credit = Math.round(Math.max(0, Math.min(Number(order.totalAmount), walletSpent + captured) - alreadyCredited) * 100) / 100;
      if (credit > 0) {
        await tx.walletLedgerEntry.create({ data: { userId: order.customerId, orderId: order.id, subscriptionId: order.subscriptionId, direction: "CREDIT", amount: credit, reference: "overdue:" + order.id, description: "Full paid-value wallet credit after one-hour delivery delay", metadata: { reason: "DELIVERY_OVERDUE", operationFeeINR: 0, mode: "wallet-credit" } } });
        await tx.paymentLedgerEntry.create({ data: { orderId: order.id, category: "REFUND", amount: credit, reference: "overdue:" + order.id, metadata: { mode: "wallet-credit", reason: "DELIVERY_OVERDUE" } } });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", ...(credit > 0 ? { paymentStatus: "REFUNDED" } : {}) } });
      await tx.bulkDeliveryRequest.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await tx.payment.updateMany({ where: { orderId: order.id, provider: "not_configured", status: "PENDING" }, data: { status: "FAILED" } });
      await tx.delivery.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED", failureReason: "One-hour delivery timeout", handoverNonce: null, currentLatitude: null, currentLongitude: null, currentAccuracyMeters: null, locationUpdatedAt: null, locationConsentAt: null } });
      await tx.earning.updateMany({ where: { orderId: order.id, status: { in: ["PENDING", "AVAILABLE"] } }, data: { status: "REVERSED" } });
      if (["ORDER_PLACED", "CONFIRMED", "ASSIGNED_TO_MOTHER"].includes(order.status)) await restoreUnpreparedCapacity(tx, order.items);
      await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", detail: `Automatically cancelled after the scheduled delivery became one hour overdue. ₹${credit.toFixed(2)} paid value credited to wallet, with no cancellation fee.` } });
      await tx.cancellationRequest.create({ data: { userId: order.customerId, orderId: order.id, subscriptionId: order.subscriptionId, status: "APPROVED", refundAmount: credit, decidedAt: now, ruleSnapshot: { reason: "DELIVERY_OVERDUE", overdueMinutes: 60, operationFeeINR: 0, mode: "wallet-credit" } } });
      if (order.subscriptionId && !await tx.order.count({ where: { subscriptionId: order.subscriptionId, status: { not: "CANCELLED" } } })) await tx.subscription.update({ where: { id: order.subscriptionId }, data: { status: "CANCELLED", cancelledAt: now } });
      const recipients = new Set([order.customerId, order.mother.userId, ...(order.delivery?.agent ? [order.delivery.agent.userId] : [])]);
      await tx.notification.createMany({ data: [...recipients].map(userId => ({ userId, title: "Order cancelled after delivery delay", body: `${order.orderNumber} exceeded its scheduled delivery by one hour. ${credit > 0 ? `₹${credit.toFixed(2)} returned to the customer wallet.` : "No paid value was due for wallet credit."}`, kind: "ORDER", entityId: order.id })) });
      return true;
    });
    if (changed) cancelled.push(candidate.id);
  }
  if (cancelled.length) scheduleEntityPush(cancelled);
  return { cancelled: cancelled.length, checked: candidates.length };
}
