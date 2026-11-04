import { NextResponse } from "next/server";
import { validRazorpaySignature, recordRazorpayReceipt } from "@/lib/razorpay";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook setup pending." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 100000 || !validRazorpaySignature(raw, request.headers.get("x-razorpay-signature") || "", secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.event !== "payment.captured") return NextResponse.json({ received: true });
    const payment = event.payload?.payment?.entity;
    if (!/^order_[A-Za-z0-9]+$/.test(payment?.order_id) || !/^pay_[A-Za-z0-9]+$/.test(payment?.id)) return NextResponse.json({ error: "Invalid payment event." }, { status: 400 });
    const result = await recordRazorpayReceipt(payment.order_id, payment.id);
    if (!result.paid) return NextResponse.json({ error: "Capture not confirmed yet." }, { status: 503 });
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Could not reconcile payment. Retry required." }, { status: 503 }); }
}

