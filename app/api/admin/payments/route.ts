import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const captureSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(["UPI", "CASH"]),
  reference: z.string().trim().min(3).max(120),
});

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the order and payment reference." }, { status: 400 }); }
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the payment details." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: parsed.data.orderId }, include: { payments: true } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "CANCELLED" || order.status === "FAILED" || order.paymentStatus !== "PENDING") throw new Error("ORDER_NOT_PAYABLE");
      const pending = order.payments.filter((payment) => payment.status === "PENDING");
      const due = pending.reduce((sum, payment) => sum + Number(payment.amount), 0);
      if (due <= 0) throw new Error("NO_BALANCE_DUE");
      const paymentReference = "pilot:" + parsed.data.provider.toLowerCase() + ":" + parsed.data.reference;
      const updated = await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { provider: "manual_" + parsed.data.provider.toLowerCase(), providerPaymentId: paymentReference, status: "CAPTURED", capturedAt: new Date() },
      });
      if (updated.count !== pending.length) throw new Error("PAYMENT_CHANGED");
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "CAPTURED" } });
      await tx.paymentLedgerEntry.create({ data: {
        paymentId: pending[0]?.id, orderId: order.id, category: "CUSTOMER_CHARGE", amount: due,
        currency: order.currency, reference: paymentReference, metadata: { channel: parsed.data.provider, externalReference: parsed.data.reference, manuallyRecordedByAdmin: admin.id },
      } });
      await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: admin.id, status: order.status, detail: "Admin recorded an externally collected " + parsed.data.provider + " payment. Reference: " + parsed.data.reference } });
      await tx.adminActivityLog.create({ data: {
        adminId: admin.id, action: "PILOT_PAYMENT_CAPTURED", entityType: "ORDER", entityId: order.id,
        newValue: { amountINR: due, channel: parsed.data.provider, reference: parsed.data.reference },
      } });
      await tx.notification.create({ data: { userId: order.customerId, title: "Payment recorded", body: "Your " + parsed.data.provider + " payment for order " + order.orderNumber + " was recorded by Pausstik.", kind: "PAYMENT", entityId: order.id } });
      return { orderNumber: order.orderNumber, amount: due, currency: order.currency };
    });
    return NextResponse.json({ captured: true, ...result, message: "Payment recorded from the external " + parsed.data.provider + " collection." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (code === "ORDER_NOT_PAYABLE" || code === "NO_BALANCE_DUE") return NextResponse.json({ error: "This order has no unpaid balance." }, { status: 409 });
    if (code === "PAYMENT_CHANGED") return NextResponse.json({ error: "The payment changed while you were saving. Refresh the admin dashboard." }, { status: 409 });
    console.error("Pausstik admin payment record failed.", code || "unknown error");
    return serviceUnavailable();
  }
}
