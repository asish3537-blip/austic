import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { lockWallet } from "@/lib/marketplace-rules";

export function razorpayConfig() {
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return id && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(id) && secret ? { id, secret } : null;
}
export function validRazorpaySignature(message: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(createHmac("sha256", secret).update(message).digest("hex"), "hex"), Buffer.from(signature, "hex"));
}
export async function razorpayRequest(path: string, data?: unknown) {
  const config = razorpayConfig();
  if (!config) throw new Error("Razorpay is not configured.");
  const response = await fetch("https://api.razorpay.com/v1/" + path, {
    method: data ? "POST" : "GET", headers: { Authorization: "Basic " + Buffer.from(config.id + ":" + config.secret).toString("base64"), "Content-Type": "application/json" },
    ...(data ? { body: JSON.stringify(data) } : {}), cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Razorpay could not complete the request.");
  return response.json();
}
export async function recordRazorpayReceipt(providerOrderId: string, paymentId: string) {
  const row = await prisma.payment.findUnique({ where: { idempotencyKey: "razorpay:" + providerOrderId }, include: { order: true } });
  if (!row) throw new Error("Unknown payment order.");
  const remote = await razorpayRequest("payments/" + encodeURIComponent(paymentId));
  if (remote.id !== paymentId || remote.order_id !== providerOrderId || remote.currency !== "INR" || remote.amount !== Number(row.amount.mul(100).toFixed(0))) throw new Error("Payment details do not match this order.");
  if (remote.status !== "captured" || remote.captured !== true) return { paid: false };
  return prisma.$transaction(async tx => {
    await lockWallet(tx, row.order.customerId);
    const current = await tx.payment.findUniqueOrThrow({ where: { id: row.id }, include: { order: true } });
    if (current.status === "CAPTURED" && current.providerPaymentId === paymentId) return { paid: true };
    if (current.status !== "PENDING") throw new Error("Payment already changed. Contact support.");
    await tx.payment.update({ where: { id: row.id }, data: { provider: "razorpay", providerPaymentId: paymentId, status: "CAPTURED", capturedAt: new Date() } });
    const closed = ["CANCELLED", "FAILED"].includes(current.order.status);
    await tx.order.update({ where: { id: row.orderId }, data: { paymentStatus: "CAPTURED" } });
    await tx.paymentLedgerEntry.create({ data: { paymentId: row.id, orderId: row.orderId, category: "CUSTOMER_CHARGE", amount: row.amount, currency: "INR", reference: "razorpay:" + paymentId, metadata: { providerOrderId, refundReviewRequired: closed } } });
    await tx.orderEvent.create({ data: { orderId: row.orderId, status: current.order.status, detail: closed ? "Razorpay receipt confirmed after order closure. Operations must review a refund." : "Razorpay confirmed the captured payment." } });
    await tx.notification.create({ data: { userId: current.order.customerId, kind: "PAYMENT", entityId: row.orderId, title: closed ? "Payment needs review" : "Payment received", body: closed ? "Payment arrived after this order closed. Contact Paustik for a refund review." : "Payment received for " + current.order.orderNumber + "." } });
    return { paid: true, refundReviewRequired: closed };
  });
}

