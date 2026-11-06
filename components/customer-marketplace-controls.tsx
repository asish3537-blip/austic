"use client";

import { UiText } from "@/components/ui-language";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PinState = "loading" | "ready" | "missing" | "saving" | "error";
export { WeeklyPlanPicker } from "@/components/weekly-plan-picker";

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
        window.dispatchEvent(new Event("paustik-wallet-updated"));
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
    <button type="button" className="button button-small" onClick={savePin} disabled={state === "loading" || state === "saving"}>{state === "saving" ? "Waiting for GPS…" : state === "ready" ? "Update location" : "Use my location"}</button>
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
      window.dispatchEvent(new Event("paustik-wallet-updated"));
      router.push("/customer/orders#order-history");
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
      <label><UiText text="Servings"/><select aria-label="Servings" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
        {Array.from({ length: Math.min(8, servings) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
      </select></label>
      <button type="button" className="button button-small" onClick={placeOrder} disabled={busy || servings < 1}>{busy ? "Saving…" : <UiText text="Order meal"/>}</button>
    </div>
    {message && <p className={"customer-order-message " + (error ? "is-error" : "")}>{message}</p>}
  </div>;
}

export { PilotCustomerWallet as CustomerWallet } from "@/components/pilot-customer-wallet";

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
      window.dispatchEvent(new Event("paustik-wallet-updated"));
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not update your favourite kitchens."); }
    finally { setBusy(false); }
  }
  return <div className="favorite-kitchen-action"><button type="button" aria-pressed={saved} onClick={toggle} disabled={busy}>{busy ? "Saving…" : saved ? "♥ Mother saved" : "♡ Save this mother"}</button>{message && <small role="status">{message}</small>}</div>;
}

export function CancelOrderButton({ orderId, scheduledFor, orderStatus }: { orderId: string; scheduledFor: string; orderStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const eligible = ["ORDER_PLACED", "CONFIRMED"].includes(orderStatus);
  if (!eligible) return null;
  const cutoffAt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(new Date(scheduledFor).getTime() - 5 * 60 * 60 * 1000));
  async function cancelDay() {
    if (!window.confirm("Cancel this meal day? Eligible paid value will return to your Paustik wallet after a ₹5 processing fee.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/customer/orders/" + encodeURIComponent(orderId) + "/cancel", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not cancel this meal day.");
      setMessage(data.message);
      window.dispatchEvent(new Event("paustik-wallet-updated"));
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not cancel this meal day."); }
    finally { setBusy(false); }
  }
  return <div className="customer-cancel-action"><small>Cancel by {cutoffAt}</small><button type="button" onClick={cancelDay} disabled={busy}>{busy ? "Cancelling…" : "Cancel this day"}</button>{message && <small role="status">{message}</small>}</div>;
}

export { OrderTracking as CustomerDeliveryTracking } from "@/components/order-tracking";
