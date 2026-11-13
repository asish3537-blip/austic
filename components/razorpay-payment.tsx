"use client";
import { UiText } from "@/components/ui-language";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Result = { razorpay_payment_id: string; razorpay_signature: string };
type Checkout = { open(): void; on(name: string, callback: () => void): void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => Checkout } }
let loading: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { loading = null; script.remove(); reject(new Error("Could not load checkout. Please retry.")); };
    document.head.appendChild(script);
  });
  return loading;
}
export function RazorpayPayment({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function request(body: unknown) {
    const r = await fetch("/api/customer/razorpay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Payment request failed."); return d;
  }
  async function pay() {
    setBusy(true); setMessage("");
    try {
      await loadCheckout();
      const d = await request({ action: "checkout", orderId });
      if (!window.Razorpay) throw new Error("Checkout is unavailable.");
      const checkout = new window.Razorpay({
        key: d.key, amount: d.amount, currency: d.currency, order_id: d.providerOrderId,
        name: "Paustik", description: d.description, theme: { color: "#17553e" },
        handler: async (result: Result) => {
          try {
            const confirmation = await request({ action: "confirm", orderId, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature });
            setMessage(confirmation.paid ? confirmation.refundReviewRequired ? "Payment received after order closure. Contact support for refund review." : "Payment confirmed." : "Payment is awaiting capture. Check your orders again shortly.");
            router.refresh();
          } catch (e) { setMessage(e instanceof Error ? e.message + " Keep your payment reference if money was debited." : "Confirmation pending. Contact support."); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: () => { setBusy(false); setMessage("Checkout closed. Refresh orders before retrying if money was debited."); router.refresh(); } },
      });
      checkout.on("payment.failed", () => { setBusy(false); setMessage("Payment did not complete. Check your UPI app or bank before retrying."); });
      checkout.open();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not open payment."); setBusy(false); }
  }
  async function reconcile() {
    setBusy(true); setMessage("");
    try { const d = await request({ action: "reconcile", orderId }); setMessage(d.paid ? "Payment confirmed. Refreshing your order." : "No captured payment found yet. Check your bank before retrying."); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not check payment."); }
    finally { setBusy(false); }
  }
  return <div className="upi-payment"><button type="button" className="button button-small" onClick={pay} disabled={busy}><UiText text={busy ? "Processing…" : "Pay securely"}/></button><button type="button" className="plain-button" disabled={busy} onClick={reconcile}><UiText text="Already paid? Check status"/></button>{message && <p role="status"><UiText text={message}/></p>}</div>;
}

