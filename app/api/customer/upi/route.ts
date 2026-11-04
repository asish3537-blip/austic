import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceUnavailable } from "@/lib/http";
import { upiPaymentUri, upiReceiver } from "@/lib/upi";
import { Prisma } from "@/app/generated/prisma/client";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in as a customer." }, { status: 403, headers });
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("orderId"));
  if (!id.success) return NextResponse.json({ error: "Choose an order." }, { status: 400, headers });
  const receiver = upiReceiver();
  if (!receiver) return NextResponse.json({ error: "UPI payments are awaiting business setup." }, { status: 503, headers });
  try {
    const order = await prisma.order.findFirst({ where: { id: id.data, customerId: user.id }, select: {
      orderNumber: true, status: true, paymentStatus: true, currency: true, totalAmount: true,
      payments: { where: { status: "PENDING" }, select: { amount: true } },
    } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404, headers });
    const amount = order.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    if (order.currency.trim() !== "INR" || order.paymentStatus !== "PENDING" || ["CANCELLED", "FAILED"].includes(order.status) || amount.lte(0) || amount.gt(order.totalAmount)) {
      return NextResponse.json({ error: "This order has no payable UPI balance. Refresh your orders." }, { status: 409, headers });
    }
    const uri = upiPaymentUri(receiver, order.orderNumber, amount.toFixed(2));
    const qr = await QRCode.toDataURL(uri, { width: 280, margin: 2, errorCorrectionLevel: "M" });
    return NextResponse.json({ receiver, amount: amount.toFixed(2), orderNumber: order.orderNumber, uri, qr }, { headers });
  } catch { return serviceUnavailable(); }
}

