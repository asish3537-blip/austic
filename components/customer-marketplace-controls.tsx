"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PinState = "loading" | "ready" | "missing" | "saving" | "error";

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
      setMessage("Order " + data.orderNumber + " saved. No payment was taken.");
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
