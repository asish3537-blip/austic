"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { incomeMoney } from "@/lib/earnings-estimates";

type BulkRow = { id: string; version: number; status: string; quantity: number; unitPrice: string; deliveryFee: string | null; courierPay: string | null; vehicle: string | null; scheduledFor: string; expiresAt: string | null; customerName?: string; meal: string; kitchen: string; orderId: string | null; order: { orderNumber: string; status: string } | null };
type Courier = { id: string; vehicleType: string; user: { name: string } };
export function BulkBookings({ role }: { role: "CUSTOMER" | "MOTHER" | "ADMIN" }) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/bulk-deliveries", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows(data.requests); setCouriers(data.couriers);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Bulk bookings could not load."); }
  }, []);
  useEffect(() => { const first=setTimeout(()=>void refresh(),0); const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30000); return () => { clearTimeout(first); clearInterval(timer); }; }, [refresh]);
  async function update(row: BulkRow, action: string, fields = {}) {
    setBusy(row.id);
    try {
      const response = await fetch("/api/bulk-deliveries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, version: row.version, action, ...fields }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.message); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Booking could not update."); }
    finally { setBusy(""); }
  }
  function quote(event: FormEvent<HTMLFormElement>, row: BulkRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void update(row, "quote", { agentId: form.get("agentId"), vehicle: form.get("vehicle"), deliveryFee: Number(form.get("deliveryFee")), courierPay: Number(form.get("courierPay")) });
  }
  return <section className="bulk-bookings"><p>For larger meal quantities, the kitchen confirms capacity and operations arranges a suitable vehicle. Review the food and delivery quote before confirming. Requests reserve no stock.</p>{message && <p role="status">{message}</p>}{!rows.length && <p>No bulk bookings yet. Request one from a kitchen’s menu.</p>}{rows.map(row => <article className="dashboard-card" key={row.id}><div className="workspace-record-head"><h3>{row.quantity} × {row.meal}</h3><span className="customer-status">{row.status.replaceAll("_", " ")}</span></div><p>{row.kitchen}{row.customerName ? " · " + row.customerName : ""}</p><p>{new Date(row.scheduledFor).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><p>Food {incomeMoney(Number(row.unitPrice) * row.quantity)}{row.deliveryFee !== null && <> · Arranged delivery {incomeMoney(Number(row.deliveryFee))} · Total <strong>{incomeMoney(Number(row.unitPrice) * row.quantity + Number(row.deliveryFee))}</strong></>}</p>{row.vehicle && <p>Vehicle arrangement · {row.vehicle}</p>}{row.expiresAt && row.status === "QUOTED" && <small>Quote expires {new Date(row.expiresAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST. Wallet credit is applied on confirmation.</small>}
      {role === "MOTHER" && row.status === "KITCHEN_REVIEW" && <button className="button" disabled={busy === row.id} onClick={() => void update(row, "kitchenAccept")}>Confirm kitchen capacity</button>}
      {role === "ADMIN" && ["OPERATIONS_REVIEW", "QUOTED"].includes(row.status) && <form className="workspace-form" onSubmit={event => quote(event, row)}><label>Arranged courier<select name="agentId" required><option value="">Choose approved courier</option>{couriers.map(courier => <option key={courier.id} value={courier.id}>{courier.user.name} · {courier.vehicleType}</option>)}</select></label><label>Vehicle and capacity arrangement<input name="vehicle" required minLength={3} maxLength={120} placeholder="EV cargo vehicle · insulated boxes for 20 meals" /></label><label>Customer delivery quote · ₹<input name="deliveryFee" type="number" required min={0} max={5000} step=".01" /></label><label>Agreed courier earnings · ₹<input name="courierPay" type="number" required min={9} max={5000} step=".01" /></label><button className="button" disabled={busy === row.id}>Send 30-minute quote</button></form>}
      {role === "CUSTOMER" && row.status === "QUOTED" && <button className="button" disabled={busy === row.id || new Date(row.expiresAt!) <= new Date()} onClick={() => void update(row, "checkout")}>Accept quote & reserve meals</button>}
      {role === "ADMIN" && row.status === "BOOKED" && <button className="button" disabled={busy === row.id} onClick={() => void update(row, "dispatch")}>Assign arranged courier when ready</button>}
      {["KITCHEN_REVIEW", "OPERATIONS_REVIEW", "QUOTED"].includes(row.status) && <button className="plain-button" disabled={busy === row.id} onClick={() => void update(row, role === "CUSTOMER" ? "cancel" : "decline")}>{role === "CUSTOMER" ? "Cancel request" : "Decline request"}</button>}
      {row.orderId && <p><Link href={role === "CUSTOMER" ? `/customer/orders#order-${row.orderId}` : role === "MOTHER" ? "/mother/dashboard#incoming-orders" : "/admin/orders"}>View {row.order?.orderNumber} · {row.order?.status.replaceAll("_", " ")} →</Link></p>}
    </article>)}</section>;
}

export function BulkMealRequest({ menuId, stock }: { menuId: string; stock: number }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (stock < 9) return null;
  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch("/api/bulk-deliveries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", menuId, quantity: Number(form.get("quantity")), notes: form.get("notes") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.message);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Request could not save."); }
    finally { setBusy(false); }
  }
  return <details className="bulk-meal-request"><summary>Ordering for a group?</summary><form onSubmit={request}><label>Meals needed<input name="quantity" type="number" min={9} max={Math.min(stock, 100)} defaultValue={Math.min(stock, 15)} required /></label><label>Arrangement notes<input name="notes" maxLength={500} placeholder="Office lunch, packaging or vehicle needs" /></label><button className="button button-quiet" disabled={busy}>Request bulk arrangement</button></form>{message && <p role="status">{message} <Link href="/customer/bulk">My bulk requests →</Link></p>}</details>;
}
