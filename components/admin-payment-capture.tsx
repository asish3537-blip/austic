"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type DueOrder = { id: string; orderNumber: string; customer: string; kitchen: string; scheduledFor: string; currency: string; amountDue: number };

export function AdminPaymentCapture({ orders }: { orders: DueOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function record(orderId: string, form: FormData) {
    setBusy(orderId); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, provider: String(form.get("provider") || "UPI"), reference: String(form.get("reference") || "") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record payment.");
      setMessage(data.message + " " + data.orderNumber + " · ₹" + data.amount.toFixed(0));
      router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Could not record payment."); }
    finally { setBusy(""); }
  }
  function submit(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    void record(orderId, new FormData(event.currentTarget));
  }
  return <section className="admin-section" aria-labelledby="pilot-collection-title">
    <div className="admin-section-heading"><div><span className="eyebrow">Pilot collection log</span><h2 id="pilot-collection-title">Record confirmed UPI or cash</h2></div></div>
    <p className="admin-finance-note">Use only after you confirm the customer has paid outside the app. This form records a receipt; it does not collect money.</p>
    {message && <p className={"admin-payment-message " + (error ? "is-error" : "")} role="status">{message}</p>}
    {orders.length ? <div className="admin-payment-list">{orders.map((order) => <article key={order.id}>
      <div><strong>{order.orderNumber} · ₹{order.amountDue.toFixed(0)} due</strong><span>{order.customer} · {order.kitchen}</span><small>Scheduled {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(order.scheduledFor))}</small></div>
      <form onSubmit={(event) => submit(event, order.id)}>
        <select name="provider" aria-label="Payment method"><option value="UPI">UPI</option><option value="CASH">Cash</option></select>
        <input name="reference" required minLength={3} maxLength={120} placeholder="UPI ref or cash receipt no." aria-label="Payment reference" />
        <button className="button button-small" type="submit" disabled={busy === order.id}>{busy === order.id ? "Saving…" : "Record receipt"}</button>
      </form>
    </article>)}</div> : <p className="admin-empty-inline">No customer balances are waiting for collection.</p>}
  </section>;
}
