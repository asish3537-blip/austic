import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockWallet } from "@/lib/marketplace-rules";
import { rejectCrossOrigin } from "@/lib/http";
import { razorpayConfig, razorpayRequest, validRazorpaySignature, recordRazorpayReceipt } from "@/lib/razorpay";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reconcile"), orderId: z.string().uuid() }),
  z.object({ action: z.literal("checkout"), orderId: z.string().uuid() }),
  z.object({ action: z.literal("confirm"), orderId: z.string().uuid(), paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/), signature: z.string().regex(/^[a-f0-9]{64}$/i) }),
]);
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request); if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403, headers });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Check the payment request." }, { status: 400, headers });
  const config = razorpayConfig();
  if (!config) return NextResponse.json({ error: "Online checkout is temporarily unavailable." }, { status: 503, headers });
  try {
    if (input.data.action === "confirm" || input.data.action === "reconcile") {

      const local = await prisma.payment.findFirst({ where: { orderId: input.data.orderId, provider: "razorpay", order: { customerId: user.id } } });
      const providerOrderId = local?.idempotencyKey?.replace(/^razorpay:/, "");
      if (!providerOrderId) return NextResponse.json({ paid: false }, { headers });
      if (input.data.action === "reconcile") {
        const list = await razorpayRequest("orders/" + encodeURIComponent(providerOrderId) + "/payments");
        const captured = list.items?.find((p: { status: string }) => p.status === "captured");
        return NextResponse.json(captured ? await recordRazorpayReceipt(providerOrderId, captured.id) : { paid: false }, { headers });
      }
      const { paymentId, signature } = input.data;
      if (!validRazorpaySignature(providerOrderId + "|" + paymentId, signature, config.secret)) return NextResponse.json({ error: "Payment verification failed." }, { status: 400, headers });
      return NextResponse.json(await recordRazorpayReceipt(providerOrderId, paymentId), { headers });
    }
    const result = await prisma.$transaction(async tx => {
      await lockWallet(tx, user.id);
      const order = await tx.order.findFirst({ where: { id: input.data.orderId, customerId: user.id }, include: { payments: true } });
      if (!order || ["CANCELLED", "FAILED"].includes(order.status) || order.paymentStatus !== "PENDING" || order.currency.trim() !== "INR") throw new Error("This order has no payable balance.");
      const pending = order.payments.filter(p => p.status === "PENDING");
      if (pending.length !== 1 || pending[0].amount.lte(0) || pending[0].amount.gt(order.totalAmount)) throw new Error("Contact support to reconcile this order.");
      const payment = pending[0];
      const amount = Number(payment.amount.mul(100).toFixed(0));
      let providerOrderId = payment.provider === "razorpay" ? payment.idempotencyKey?.replace(/^razorpay:/, "") : null;
      if (!providerOrderId) {
        const remote = await razorpayRequest("orders", { amount, currency: "INR", receipt: payment.id, partial_payment: false });
        if (!/^order_[A-Za-z0-9]+$/.test(remote.id) || remote.amount !== amount || remote.currency !== "INR") throw new Error("Checkout response did not match the order.");
        providerOrderId = remote.id as string;
        await tx.payment.update({ where: { id: payment.id }, data: { provider: "razorpay", idempotencyKey: "razorpay:" + providerOrderId } });
      }
      return { key: config.id, providerOrderId, amount, currency: "INR", description: order.orderNumber };
    }, { timeout: 20000 });
    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("Razorpay checkout failed.", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not complete this payment step. Refresh your orders or contact support." }, { status: 409, headers });
  }
}

