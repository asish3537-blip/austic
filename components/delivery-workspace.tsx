"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DeliveryJob = {
  deliveryId: string; orderId: string; orderNumber: string; deliveryStatus: string; orderStatus: string;
  trackingReference: string | null; pickup: string; dropoff: string; items: string[]; scheduledFor: string;
  pickupPinned: boolean; dropoffPinned: boolean; isSharingLocation: boolean;
};
type Jobs = { available: DeliveryJob[]; assigned: DeliveryJob[] };
const nextAction: Record<string, { status: string; label: string }> = {
  ACCEPTED: { status: "GOING_TO_PICKUP", label: "Head to pickup" },
  GOING_TO_PICKUP: { status: "PICKED_UP", label: "Confirm pickup" },
  PICKED_UP: { status: "OUT_FOR_DELIVERY", label: "Start delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Confirm delivered" },
};

export function DeliveryWorkspace() {
  const [jobs, setJobs] = useState<Jobs>({ available: [], assigned: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [watchingId, setWatchingId] = useState("");
  const [gpsState, setGpsState] = useState("");
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/delivery/jobs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load delivery jobs.");
      setJobs(data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load delivery jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 20000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
      if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [refresh]);

  async function claim(job: DeliveryJob) {
    setBusyId(job.deliveryId);
    setMessage("");
    try {
      const response = await fetch("/api/delivery/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryId: job.deliveryId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not accept this delivery.");
      setMessage("Delivery accepted. Start location sharing before pickup so the geofence can verify handover.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept this delivery.");
    } finally {
      setBusyId("");
    }
  }

  async function advance(job: DeliveryJob) {
    const next = nextAction[job.deliveryStatus];
    if (!next) return;
    setBusyId(job.deliveryId);
    setMessage("");
    try {
      const response = await fetch("/api/delivery/jobs/" + job.deliveryId, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next.status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the delivery.");
      if (next.status === "DELIVERED") stopLocalWatch();
      setMessage("Order " + job.orderNumber + " marked " + next.status.toLowerCase().replaceAll("_", " ") + ".");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the delivery.");
    } finally {
      setBusyId("");
    }
  }

  function stopLocalWatch() {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatchingId("");
  }

  function startLocation(job: DeliveryJob) {
    if (!navigator.geolocation) {
      setGpsState("This device cannot provide GPS location.");
      return;
    }
    stopLocalWatch();
    lastSentAt.current = 0;
    setGpsState("Waiting for a precise GPS fix…");
    setWatchingId(job.deliveryId);
    watchId.current = navigator.geolocation.watchPosition(async (position) => {
      if (Date.now() - lastSentAt.current < 8000) return;
      lastSentAt.current = Date.now();
      try {
        const response = await fetch("/api/delivery/jobs/" + job.deliveryId + "/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, sharingConsent: true }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "GPS update was not accepted.");
        setGpsState("Location sharing is on · updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } catch (error) {
        setGpsState(error instanceof Error ? error.message : "GPS update was not accepted.");
      }
    }, (error) => {
      setGpsState(error.code === error.PERMISSION_DENIED ? "Location permission was declined. Enable it in browser settings to use delivery geofencing." : "Could not read GPS. Move outdoors and try again.");
      stopLocalWatch();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  async function stopLocation(job: DeliveryJob) {
    stopLocalWatch();
    setGpsState("Stopping location sharing…");
    try {
      const response = await fetch("/api/delivery/jobs/" + job.deliveryId + "/location", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not stop location sharing.");
      setGpsState("Location sharing stopped. A fresh fix is required for geofence handover steps.");
      await refresh();
    } catch (error) {
      setGpsState(error instanceof Error ? error.message : "Could not stop location sharing.");
    }
  }

  if (loading) return <div className="dashboard-banner">Loading delivery board…</div>;
  return <div className="delivery-workspace">
    <section className="delivery-privacy-note"><strong>GPS is opt-in.</strong> Your location is shared with the customer only while the order is picked up or out for delivery. Pausstik stores one latest point and clears it at handover or when you stop sharing.</section>
    {message && <p className="workspace-message" role="status">{message}</p>}
    <section className="delivery-jobs-grid">
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow">Ready nearby</span><h2>Available deliveries</h2></div><span className="customer-count">{jobs.available.length}</span></div>
        {jobs.available.length ? <div className="workspace-record-list">{jobs.available.map((job) => <article key={job.deliveryId}>
          <div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active">Ready for pickup</span></div>
          <p>{job.items.join(", ")}</p><small>Pickup: {job.pickup} · Drop-off: {job.dropoff}</small>
          <button className="button button-small" type="button" onClick={() => claim(job)} disabled={busyId === job.deliveryId}>{busyId === job.deliveryId ? "Accepting…" : "Accept delivery"}</button>
        </article>)}</div> : <div className="customer-empty-state"><strong>No ready jobs nearby</strong><span>New deliveries appear after a kitchen marks an order ready for pickup.</span></div>}
      </article>
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow">Your route</span><h2>Assigned deliveries</h2></div><span className="customer-count">{jobs.assigned.length}</span></div>
        {jobs.assigned.length ? <div className="workspace-record-list">{jobs.assigned.map((job) => {
          const next = nextAction[job.deliveryStatus];
          return <article key={job.deliveryId}>
            <div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active">{job.deliveryStatus.toLowerCase().replaceAll("_", " ")}</span></div>
            <p>{job.items.join(", ")}</p><small>Pickup: {job.pickup} · Drop-off: {job.dropoff}</small>
            <div className="delivery-pin-status"><span>{job.pickupPinned ? "Pickup geofence ready" : "Pickup pin missing"}</span><span>{job.dropoffPinned ? "Drop-off geofence ready" : "Drop-off pin missing"}</span></div>
            {job.deliveryStatus !== "DELIVERED" && <div className="delivery-location-actions">
              {watchingId === job.deliveryId ? <button type="button" className="button button-quiet" onClick={() => stopLocation(job)}>Stop sharing</button> : <button type="button" className="button button-quiet" onClick={() => startLocation(job)}>{job.isSharingLocation ? "Resume location sharing" : "Start location sharing"}</button>}
              {job.isSharingLocation && watchingId !== job.deliveryId && <button type="button" className="delivery-revoke-button" onClick={() => stopLocation(job)}>Revoke location sharing</button>}
              {watchingId === job.deliveryId && <small>{gpsState || "Waiting for GPS…"}</small>}
            </div>}
            {job.deliveryStatus === "ACCEPTED" && <button type="button" className="button button-quiet" onClick={() => advance(job)} disabled={busyId === job.deliveryId}>{busyId === job.deliveryId ? "Saving…" : "Head to pickup"}</button>}
            {next && job.deliveryStatus !== "ACCEPTED" && <button type="button" className="button button-small" onClick={() => advance(job)} disabled={busyId === job.deliveryId}>{busyId === job.deliveryId ? "Saving…" : next.label}</button>}
          </article>;
        })}</div> : <div className="customer-empty-state"><strong>No delivery assigned</strong><span>Accept a job when you are ready to take it.</span></div>}
      </article>
    </section>
    <p className="dashboard-banner">The 150 m pickup and drop-off geofences need accurate kitchen and customer pins. GPS can be inaccurate or spoofed; Pausstik records each handover step for operations review.</p>
  </div>;
}
