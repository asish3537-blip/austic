"use client";

import Image from "next/image";
import { useState } from "react";
type Details = { receiver: { id: string; name: string }; amount: string; orderNumber: string; uri: string; qr: string };

export function UpiPayment({ orderId }: { orderId: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true); setError(""); setDetails(null);
    try {
      const r = await fetch("/api/customer/upi?orderId=" + encodeURIComponent(orderId), { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Could not load UPI payment details.");
      setDetails(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="upi-payment">
    <button className="button button-small" type="button" disabled={busy} onClick={() => { if (details) setDetails(null); else void load(); }}>{busy ? "Loading…" : details ? "Close UPI details" : "Pay by UPI"}</button>
    {error && <p role="alert">{error}</p>}
    {details && <section aria-label={"UPI payment for " + details.orderNumber}>
      <h3>Pay ₹{details.amount}</h3>
      <p>{details.receiver.name} · {details.receiver.id}</p>
      <Image src={details.qr} alt={"Scan to pay ₹" + details.amount + " for " + details.orderNumber} width={240} height={240} unoptimized />
      <p><a className="button button-small" href={details.uri}>Pay in UPI app</a></p>
      <p>Check the receiver and amount in your UPI app before paying. Keep the transaction reference.</p>
      <p>Payment stays pending until Pausstik verifies receipt. Contact support with your order number if it is not updated.</p>
    </section>}
  </div>;
}

