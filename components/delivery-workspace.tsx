"use client";

import { PartnerIncomePanel } from "@/components/partner-income-panel";
import { incomeMoney, type EstimatePolicy } from "@/lib/earnings-estimates";
import { UiText } from "@/components/ui-language";
import { useCallback, useEffect, useRef, useState } from "react";

type DeliveryJob = {
  estimatedPay:number;routeDistanceKm:number|null;alertAt:string;isUpcoming?:boolean;
  deliveryId: string; orderId: string; orderNumber: string; deliveryStatus: string; orderStatus: string;
  trackingReference: string | null; pickup: string; dropoff: string; items: string[]; scheduledFor: string;
  pickupPinned: boolean; dropoffPinned: boolean; isSharingLocation: boolean;
  pickupNavigation: string | null; dropoffNavigation: string | null;
};
type Jobs = { available: DeliveryJob[]; assigned: DeliveryJob[]; upcoming:DeliveryJob[];userScope?:string;area?:{online:boolean;city:string;radiusKm:number};policy?:EstimatePolicy };
const nextAction: Record<string, { status: string; label: string }> = {
  ACCEPTED: { status: "GOING_TO_PICKUP", label: "Head to pickup" },
  GOING_TO_PICKUP: { status: "PICKED_UP", label: "Confirm pickup" },
  PICKED_UP: { status: "OUT_FOR_DELIVERY", label: "Start delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Confirm delivered" },
};

export function DeliveryWorkspace() {
  const [jobs, setJobs] = useState<Jobs>({ available: [], assigned: [], upcoming:[] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [watchingId, setWatchingId] = useState("");
  const [gpsState, setGpsState] = useState("");
  const [offer,setOffer]=useState<DeliveryJob|null>(null);
  const [city,setCity]=useState("");const [radius,setRadius]=useState(8);const [areaBusy,setAreaBusy]=useState(false);
  const modal=useRef<HTMLDialogElement|null>(null);const seen=useRef(new Set<string>());const initialOffers=useRef(true);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/delivery/jobs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load delivery jobs.");
      setJobs({...data,upcoming:data.upcoming||[]});
      setCity(current=>current||data.area?.city||"");
      const offers=[...(data.available||[]),...(data.upcoming||[])];
      const fresh=offers.find((job:DeliveryJob)=>{const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus;let stored=false;try{stored=sessionStorage.getItem("paustik-offer:"+key)==="seen";}catch{}return !seen.current.has(key)&&!stored&&(!initialOffers.current||Date.now()-new Date(job.alertAt).getTime()<600000);});
      for(const job of offers){const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus;seen.current.add(key);try{sessionStorage.setItem("paustik-offer:"+key,"seen");}catch{}}
      if(initialOffers.current)setRadius(data.area?.radiusKm||8);
      initialOffers.current=false;
      setOffer(current=>current?(offers.find((j:DeliveryJob)=>j.orderId===current.orderId)||fresh||null):(fresh||null));
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

  useEffect(()=>{const dialog=modal.current;if(offer&&!dialog?.open)dialog?.showModal();if(!offer&&dialog?.open)dialog.close();},[offer]);
  async function availability(online:boolean){setAreaBusy(true);setMessage("");try{let payload:object={isAvailable:false};if(online){if(city.trim().length<2)throw new Error("Enter the city shown on your nearby kitchens.");const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}):reject(new Error("GPS is unavailable.")));payload={isAvailable:true,city,latitude:position.coords.latitude,longitude:position.coords.longitude,radiusKm:radius,consent:true};}const r=await fetch("/api/delivery/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Availability could not save.");await refresh();setMessage(d.message);}catch(e){setMessage(e instanceof Error?e.message:"Location permission is needed to go online.");}finally{setAreaBusy(false);}}
  async function claim(job: DeliveryJob) {
    setBusyId(job.deliveryId);
    setMessage("");
    try {
      const response = await fetch("/api/delivery/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryId: job.deliveryId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not accept this delivery.");
      setOffer(null);window.dispatchEvent(new Event("paustik-income-updated"));
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
      window.dispatchEvent(new Event("paustik-income-updated"));
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
    <section className="courier-availability"><div><span className="eyebrow">Your neighbourhood</span><h2>{jobs.area?.online?"Online for nearby offers":"Go online for delivery offers"}</h2><p>Choose your city and a 5–10 km area. New orders show an upcoming offer; acceptance opens when food is ready.</p></div><label>Service city<input value={city} onChange={e=>setCity(e.target.value)} maxLength={100} placeholder="e.g. Bhubaneswar"/></label><label>Radius<select value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} km</option>)}</select></label><button className="button" type="button" disabled={areaBusy} onClick={()=>void availability(true)}>{areaBusy?"Updating…":jobs.area?.online?"Update my service area":"Go online using my location"}</button>{jobs.area?.online&&<button className="plain-button" onClick={()=>void availability(false)} disabled={areaBusy}>Go offline</button>}</section>
    <PartnerIncomePanel role="DELIVERY_AGENT"/>
    <dialog ref={modal} className="delivery-offer-dialog" onCancel={()=>setOffer(null)} aria-labelledby="delivery-offer-title">{offer&&<><button className="offer-close" type="button" aria-label="Close delivery offer" onClick={()=>setOffer(null)}>×</button><span className="eyebrow">{offer.isUpcoming?"New nearby order":"Ready for pickup"}</span><h2 id="delivery-offer-title">{offer.isUpcoming?"An upcoming delivery nearby":"New delivery request"}</h2><strong className="offer-pay">{incomeMoney(offer.estimatedPay)}<small>estimated courier pay</small></strong><p>{offer.pickup}</p><small>Drop-off area: {offer.dropoff}</small><p>{new Date(offer.scheduledFor).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</p><small>{offer.routeDistanceKm===null?"Distance not available":offer.routeDistanceKm.toFixed(1)+" km straight-line estimate"}. Final route and settlement can differ.</small>{offer.isUpcoming?<p>The kitchen is confirming or preparing this order. You can accept once it is ready.</p>:<button className="button" type="button" disabled={busyId===offer.deliveryId} onClick={()=>void claim(offer)}>{busyId===offer.deliveryId?"Accepting…":"Accept delivery"}</button>}<button className="plain-button" type="button" onClick={()=>setOffer(null)}>Not now</button></>}</dialog>
    <section className="delivery-privacy-note"><strong>GPS is opt-in.</strong> Your location is shared with the customer only while the order is picked up or out for delivery. Paustik stores one latest point and clears it at handover or when you stop sharing.</section>
    {message && <p className="workspace-message" role="status">{message}</p>}
    <section className="delivery-jobs-grid" id="delivery-jobs">
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow">Ready nearby</span><h2 id="available-jobs">Available deliveries</h2></div><span className="customer-count">{jobs.available.length}</span></div>
        {jobs.available.length ? <div className="workspace-record-list">{jobs.available.map((job) => <article key={job.deliveryId}>
          <div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active"><UiText text="Ready for pickup"/></span></div>
          <p>{job.items.join(", ")}</p><strong className="courier-job-pay">{incomeMoney(job.estimatedPay)} estimated pay</strong><small>Pickup: {job.pickup} · Drop-off: {job.dropoff}</small>
          <button className="button button-small" type="button" onClick={() => claim(job)} disabled={busyId === job.deliveryId}>{busyId === job.deliveryId ? "Accepting…" : "Accept delivery"}</button>
        </article>)}</div> : <div className="customer-empty-state"><strong>No ready jobs nearby</strong><span>New deliveries appear after a kitchen marks an order ready for pickup.</span></div>}
      </article>
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow">Your route</span><h2 id="delivery-route">Assigned deliveries</h2></div><span className="customer-count">{jobs.assigned.length}</span></div>
        {jobs.assigned.length ? <div className="workspace-record-list">{jobs.assigned.map((job) => {
          const next = nextAction[job.deliveryStatus];
          return <article key={job.deliveryId}>
            <div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active">{job.deliveryStatus.toLowerCase().replaceAll("_", " ")}</span></div>
            <p>{job.items.join(", ")}</p><strong className="courier-job-pay">{incomeMoney(job.estimatedPay)} accepted estimate</strong><small>Pickup: {job.pickup} · Drop-off: {job.dropoff}</small>
            <div className="delivery-pin-status"><span>{job.pickupPinned ? "Pickup geofence ready" : "Pickup pin missing"}</span><span>{job.dropoffPinned ? "Drop-off geofence ready" : "Drop-off pin missing"}</span></div>
            <div className="delivery-location-actions">
              {job.pickupNavigation && <a className="button button-quiet" href={`https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: job.pickupNavigation, dir_action: "navigate" })}`} target="_blank" rel="noopener noreferrer">Google Maps · Kitchen ↗</a>}
              {job.dropoffNavigation && <a className="button button-quiet" href={`https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: job.dropoffNavigation, dir_action: "navigate" })}`} target="_blank" rel="noopener noreferrer">Google Maps · Customer ↗</a>}
            </div>
            <small>Opening a route shares its destination with Google Maps. Confirm the address before travelling. Navigation does not mark pickup or delivery complete. Keep Paustik open for location updates; background tracking may pause.</small>
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
    {jobs.upcoming.length>0&&<section className="dashboard-card"><div className="workspace-section-heading"><h2>Upcoming nearby pickups</h2><span className="customer-count">{jobs.upcoming.length}</span></div><p>Heads-up only. These are not accepted jobs or guaranteed income.</p><div className="workspace-record-list">{jobs.upcoming.map(job=><article key={job.orderId}><div className="workspace-record-head"><strong>{job.pickup}</strong><b className="courier-job-pay">{incomeMoney(job.estimatedPay)} estimate</b></div><small>{new Date(job.scheduledFor).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · {job.orderStatus.toLowerCase().replaceAll("_"," ")}</small><button className="plain-button" onClick={()=>setOffer(job)}>View upcoming offer</button></article>)}</div></section>}
    <p className="dashboard-banner">The 150 m pickup and drop-off geofences need accurate kitchen and customer pins. GPS can be inaccurate or spoofed; Paustik records each handover step for operations review.</p>
  </div>;
}
