"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PinState = "loading" | "ready" | "missing" | "saving" | "error";
type PlanMenu = { menuId: string; name: string; serviceDate: string; price: number; servings: number };

export function CustomerDeliveryPin({ initialPinned = false }: { initialPinned?: boolean }) {
  const [state, setState] = useState<PinState>(initialPinned ? "ready" : "loading");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (initialPinned) return;
    let active = true;
    fetch("/api/customer/address/location", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        setState(response.ok && data.pinned ? "ready" : "missing");
      })
      .catch(() => { if (active) setState("missing"); });
    return () => { active = false; };
  }, [initialPinned]);

  function savePin() {
    setMessage("");
    if (!navigator.geolocation) {
      setState("error");
      setMessage("This device cannot provide browser location.");
      return;
    }
    setState("saving");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch("/api/customer/address/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, consent: true }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save the delivery pin.");
        setState("ready");
        setMessage(data.message);
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not save the delivery pin.");
      }
    }, (error) => {
      setState("error");
      setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was declined. Enable it in your browser settings to set a delivery pin." : "Could not read your location. Try again when GPS is available.");
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  return <aside className={"customer-pin-card " + (state === "ready" ? "is-ready" : "")}>
    <div><strong>{state === "ready" ? "Delivery location ready" : "Set your delivery pin"}</strong><span>{message || (state === "ready" ? "Your drop-off pin is shared only with the courier assigned to your order." : "A precise drop-off pin lets the courier verify delivery at the right address." )}</span></div>
    {state !== "ready" && <button type="button" className="button button-small" onClick={savePin} disabled={state === "loading" || state === "saving"}>{state === "saving" ? "Waiting for GPS…" : "Use my location"}</button>}
  </aside>;
}

export function PlaceOrderButton({ menuId, servings }: { menuId: string; servings: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function placeOrder() {
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/marketplace/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not place this order.");
      setMessage(data.amountDue > 0 ? "Order " + data.orderNumber + " saved. ₹" + data.amountDue + " remains due; no payment was taken." : "Order " + data.orderNumber + " saved using wallet credit.");
      router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not place this order.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="customer-order-action">
    <div className="customer-order-controls">
      <label>Servings <select aria-label="Servings" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
        {Array.from({ length: Math.min(8, servings) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
      </select></label>
      <button type="button" className="button button-small" onClick={placeOrder} disabled={busy || servings < 1}>{busy ? "Saving…" : "Order meal"}</button>
    </div>
    {message && <p className={"customer-order-message " + (error ? "is-error" : "")}>{message}</p>}
  </div>;
}

export function CustomerWallet() {
  const [wallet, setWallet] = useState<{ balance: number; entries: { id: string; direction: string; amount: number; description: string; createdAt: string }[] } | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/customer/wallet", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (active && response.ok) setWallet(data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <section className="customer-wallet" aria-label="Pausstik wallet">
    <div className="customer-wallet-heading"><div><span className="eyebrow">Meal day adjustments</span><h2>Your Pausstik wallet</h2><p>Eligible early cancellations return to wallet after the ₹5 processing fee. Wallet credit can pay for a later order.</p></div><strong>₹{(wallet?.balance ?? 0).toFixed(0)}</strong></div>
    {wallet?.entries.length ? <ul>{wallet.entries.slice(0, 4).map((entry) => <li key={entry.id}><span>{entry.description}</span><b className={entry.direction === "CREDIT" ? "wallet-credit" : "wallet-debit"}>{entry.direction === "CREDIT" ? "+" : "−"}₹{entry.amount.toFixed(0)}</b></li>)}</ul> : <p className="customer-wallet-empty">Wallet activity will appear here when credits or order payments are recorded.</p>}
  </section>;
}

export function FavoriteKitchenButton({ kitchenId, initiallySaved = false }: { kitchenId: string; initiallySaved?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/customer/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kitchenId, favorite: !saved }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your favourite kitchens.");
      setSaved(data.saved);
      setMessage(data.message);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not update your favourite kitchens."); }
    finally { setBusy(false); }
  }
  return <div className="favorite-kitchen-action"><button type="button" aria-pressed={saved} onClick={toggle} disabled={busy}>{busy ? "Saving…" : saved ? "♥ Mother saved" : "♡ Save this mother"}</button>{message && <small role="status">{message}</small>}</div>;
}

export function WeeklyPlanPicker({ menus, kitchenName }: { menus: PlanMenu[]; kitchenName: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const groups = new Map<string, PlanMenu[]>();
  for (const menu of menus) groups.set(menu.serviceDate, [...(groups.get(menu.serviceDate) || []), menu]);

  function choose(menu: PlanMenu) {
    const current = selected.filter((id) => menus.find((candidate) => candidate.menuId === id)?.serviceDate !== menu.serviceDate);
    if (!selected.includes(menu.menuId) && current.length >= 7) return;
    setSelected(selected.includes(menu.menuId) ? current : [...current, menu.menuId]);
    setMessage("");
  }

  async function createPlan() {
    setBusy(true); setError(false); setMessage("");
    try {
      const response = await fetch("/api/customer/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuIds: selected, quantity }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reserve those meal days.");
      setMessage(data.message + (data.orders.some((order: { amountDue: number }) => order.amountDue > 0) ? " Payment remains due outside the app." : " Wallet credit covered each day."));
      setSelected([]);
      router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Could not reserve those meal days."); }
    finally { setBusy(false); }
  }

  return <div className="weekly-plan-picker">
    <div className="weekly-plan-heading"><div><strong>Choose this mother for your week</strong><span>Select 3–7 delivery days. One meal is chosen per day.</span></div><label>Servings <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>
    <div className="weekly-plan-days">{[...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([day, dayMenus]) => <div className="weekly-plan-day" key={day}><time>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(day + "T00:00:00.000Z"))}</time><div>{dayMenus.map((menu) => <label key={menu.menuId}><input type="checkbox" checked={selected.includes(menu.menuId)} onChange={() => choose(menu)} /><span>{menu.name} · ₹{menu.price}<small>{menu.servings} portions left</small></span></label>)}</div></div>)}</div>
    <button className="button button-small" type="button" disabled={busy || selected.length < 3 || selected.length > 7} onClick={createPlan}>{busy ? "Saving plan…" : "Reserve " + selected.length + " meal days"}</button>
    <small className="weekly-plan-policy">{kitchenName} · one week only · renew manually · ₹30 delivery per day · cancel a day 5+ hours before delivery to receive paid value less ₹5 in wallet.</small>
    {message && <p role="status" className={"customer-order-message " + (error ? "is-error" : "")}>{message}</p>}
  </div>;
}

export function CancelOrderButton({ orderId, scheduledFor, orderStatus }: { orderId: string; scheduledFor: string; orderStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const eligible = ["ORDER_PLACED", "CONFIRMED"].includes(orderStatus);
  if (!eligible) return null;
  const cutoffAt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(new Date(scheduledFor).getTime() - 5 * 60 * 60 * 1000));
  async function cancelDay() {
    if (!window.confirm("Cancel this meal day? Eligible paid value will return to your Pausstik wallet after a ₹5 processing fee.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/customer/orders/" + encodeURIComponent(orderId) + "/cancel", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not cancel this meal day.");
      setMessage(data.message);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not cancel this meal day."); }
    finally { setBusy(false); }
  }
  return <div className="customer-cancel-action"><small>Cancel by {cutoffAt}</small><button type="button" onClick={cancelDay} disabled={busy}>{busy ? "Cancelling…" : "Cancel this day"}</button>{message && <small role="status">{message}</small>}</div>;
}

type TrackingData = {
  orderStatus: string;
  deliveryStatus: string | null;
  location: { latitude: number; longitude: number; accuracyMeters: number; updatedAt: string } | null;
};

export function CustomerDeliveryTracking({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/marketplace/tracking?orderId=" + encodeURIComponent(orderId), { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) setTracking(data);
      } catch { /* A later polling cycle can refresh a temporary network failure. */ }
    }
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId]);

  if (!tracking) return <div className="customer-tracking"><span className="tracking-pulse" />Checking delivery updates for {orderNumber}…</div>;
  const mapUrl = tracking.location
    ? "https://www.openstreetmap.org/?mlat=" + tracking.location.latitude + "&mlon=" + tracking.location.longitude + "#map=16/" + tracking.location.latitude + "/" + tracking.location.longitude
    : null;
  return <div className="customer-tracking">
    <div className="customer-tracking-copy"><span className="tracking-pulse" /><div><strong>{tracking.deliveryStatus ? tracking.deliveryStatus.toLowerCase().replaceAll("_", " ") : "Kitchen is preparing your order"}</strong><span>{tracking.location ? "Courier location updated " + new Date(tracking.location.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Courier location appears after pickup when the courier opts in to GPS sharing."}</span></div></div>
    {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer">Open map (shares this point with OpenStreetMap)</a>}
  </div>;
}
