"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { DispatchSettings } from "@/lib/dispatch-rules";
import { incomeMoney } from "@/lib/earnings-estimates";

type Row = { id: string; batchId: string | null; status: string; handoverMethod: string | null; courier: string; orderNumber: string; kitchen: string; food: number; delivery: number; discount: number; total: number; paymentStatus: string; mother: number; courierPay: number; contribution: number };
type Coupon = { id: string; code: string; kind: string; value: string; maximumDiscount: string; isActive: boolean; endsAt: string; _count: { redemptions: number } };
export function DispatchConsole() {
  const [data, setData] = useState<{ policy: DispatchSettings & { socialLinks?: Record<string,string> }; coupons: Coupon[]; rows: Row[] } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dispatch", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Dispatch could not load."); }
  }, []);
  useEffect(() => { const first=setTimeout(()=>void refresh(),0); return()=>clearTimeout(first); }, [refresh]);
  async function save(payload: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Saved."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save."); }
    finally { setBusy(false); }
  }
  function policy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void save({ action: "policy", baseFee: Number(form.get("baseFee")), includedKm: Number(form.get("includedKm")), perKm: Number(form.get("perKm")), maximumFee: Number(form.get("maximumFee")), handoverRadiusMeters: Number(form.get("handoverRadiusMeters")), allowGpsHandover: form.get("allowGpsHandover") === "on" });
  }
  function coupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void save({ action: "coupon", code: form.get("code"), kind: form.get("kind"), value: Number(form.get("value")), minimumSpend: Number(form.get("minimumSpend")), maximumDiscount: Number(form.get("maximumDiscount")), startsAt: new Date(String(form.get("startsAt")) + ":00+05:30").toISOString(), endsAt: new Date(String(form.get("endsAt")) + ":00+05:30").toISOString(), firstOrderOnly: form.get("firstOrderOnly") === "on", usageLimit: Number(form.get("usageLimit")), perCustomerLimit: Number(form.get("perCustomerLimit")) });
  }
  return <div className="dispatch-console">{message && <p role="status">{message}</p>}{!data ? <p>Loading dispatch…</p> : <>
    <section className="console-card"><h2>Delivery rates and handover</h2><form className="workspace-form" onSubmit={policy}><div className="workspace-form-row">{[["baseFee", "Base delivery fee · ₹"], ["includedKm", "Included km"], ["perKm", "Additional km · ₹"], ["maximumFee", "Maximum fee · ₹"]].map(([name, label]) => <label key={name}>{label}<input name={name} type="number" min={name === "baseFee" ? 9 : 0} max={1000} step=".01" defaultValue={Number(data.policy[name as keyof DispatchSettings])} required /></label>)}<label>Delivery GPS radius<select name="handoverRadiusMeters" defaultValue={data.policy.handoverRadiusMeters}><option value={50}>50 metres</option><option value={100}>100 metres</option></select></label><label><input type="checkbox" name="allowGpsHandover" defaultChecked={data.policy.allowGpsHandover} /> Allow nearby GPS as an alternative to customer OTP</label></div><p>Local batches allow three orders within a 2 km cluster and 30-minute delivery window. Already reviewed checkout quotes stay valid for 15 minutes.</p><button className="button" disabled={busy}>Save delivery settings</button></form></section>
    <section className="console-card"><h2>Coupons & vouchers</h2><details><summary>Create an offer</summary><form className="workspace-form" onSubmit={coupon}><div className="workspace-form-row"><label>Coupon code<input name="code" pattern="[A-Za-z0-9_-]{3,40}" maxLength={40} required /></label><label>Discount type<select name="kind"><option value="FIXED">Fixed food discount</option><option value="PERCENT">Percentage food discount</option><option value="DELIVERY">Delivery discount</option></select></label><label>Value · ₹ or %<input name="value" type="number" min={.01} step=".01" required /></label><label>Minimum food spend · ₹<input name="minimumSpend" type="number" min={0} step=".01" defaultValue={0} required /></label><label>Maximum discount · ₹<input name="maximumDiscount" type="number" min={.01} step=".01" required /></label><label>Starts · IST<input name="startsAt" type="datetime-local" required /></label><label>Ends · IST<input name="endsAt" type="datetime-local" required /></label><label>Total redemptions<input name="usageLimit" type="number" min={1} defaultValue={100} required /></label><label>Per customer<input name="perCustomerLimit" type="number" min={1} max={100} defaultValue={1} required /></label><label><input type="checkbox" name="firstOrderOnly" /> First order only</label></div><p>One coupon per checkout. Subscription savings are allocated across its meal days. Cancellation credits use the discounted amount paid. Coupon usage remains recorded after cancellation.</p><button className="button" disabled={busy}>Create coupon</button></form></details><ul>{data.coupons.map(item => <li key={item.id}><strong>{item.code}</strong> · {item.kind} · {item.value} · {item._count.redemptions} redeemed · ends {new Date(item.endsAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} <button type="button" className="plain-button" disabled={busy} onClick={() => void save({ action: "toggleCoupon", id: item.id, active: !item.isActive })}>{item.isActive ? "Pause offer" : "Activate offer"}</button></li>)}</ul></section>
    <section className="console-card"><h2>Social channels</h2><p>Add the public Paustik channel URLs after creating the accounts. Public links appear in the footer.</p><p><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">Open YouTube ↗</a> · <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">Open Meta Business ↗</a></p><form className="workspace-form" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void save({action:"social",youtube:form.get("youtube"),facebook:form.get("facebook"),instagram:form.get("instagram")});}}>{["youtube","facebook","instagram"].map(channel=><label key={channel}>{channel}<input name={channel} type="url" maxLength={300} defaultValue={data.policy.socialLinks?.[channel]||""} placeholder={"https://www."+channel+".com/your-channel"}/></label>)}<button className="button" disabled={busy}>Save public channel links</button></form></section>
    <section className="console-card"><h2>Dispatch & order contribution</h2><p>Latest 50 deliveries. Estimated partner shares are shown alongside the saved customer quote. Contribution excludes ingredient, payment-processing and other operating costs.</p><div className="console-table-wrap"><table className="console-table"><thead><tr><th>Order / batch</th><th>Dispatch</th><th>Customer quote</th><th>Partner estimates</th><th>Contribution</th><th>Handover</th></tr></thead><tbody>{data.rows.map(row => <tr key={row.id}><td>{row.orderNumber}<small>{row.batchId?.slice(0, 8) ?? "Unbatched"} · {row.kitchen}</small></td><td>{row.status}<small>{row.courier}</small></td><td>{incomeMoney(row.food)} food + {incomeMoney(row.delivery)} delivery − {incomeMoney(row.discount)} discount<strong>{incomeMoney(row.total)}</strong><small>{row.paymentStatus}</small></td><td>Mother {incomeMoney(row.mother)}<small>Courier {incomeMoney(row.courierPay)}</small></td><td>{incomeMoney(row.contribution)}</td><td>{row.handoverMethod ?? "Pending"}{row.status === "OUT_FOR_DELIVERY" && <details><summary>Operations exception</summary><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); if (window.confirm("Confirm you have verified this order reached the customer? This action is recorded.")) void save({ action: "handoverOverride", deliveryId: row.id, reason: form.get("reason") }); }}><label>Evidence and reason<textarea name="reason" minLength={15} maxLength={500} required /></label><button disabled={busy}>Record delivered exception</button></form></details>}</td></tr>)}</tbody></table></div></section>
  </>}</div>;
}
