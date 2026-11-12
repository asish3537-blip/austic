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
type Jobs = { available: DeliveryJob[]; assigned: DeliveryJob[]; upcoming:DeliveryJob[];userScope?:string;area?:{online:boolean;city:string;radiusKm:number};zones?:{id:string;name:string;locality:string;city:string}[];policy?:EstimatePolicy;dispatch?:{handoverRadiusMeters:number;allowGpsHandover:boolean};capacity?:{arrangedBulk?:boolean;maxOrders:number;mealCapacity:number;activeOrders:number;activeMeals:number};route?:{id:string;kind:string}[] };
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
  const assignedJobs = useRef<DeliveryJob[]>([]);
  const [batchPreview,setBatchPreview]=useState<{deliveryIds:string[];meals:number;estimate:number;route:{kind:string;orderNumber:string;area:string}[]}|null>(null);
  const [selectedJobs,setSelectedJobs]=useState<string[]>([]);
  const [zoneId,setZoneId]=useState("");
  const [mealCapacity,setMealCapacity]=useState(6);
  const [handoverCodes,setHandoverCodes]=useState<Record<string,string>>({});
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
      assignedJobs.current=data.assigned||[];
      setCity(current=>current||data.area?.city||"");
      const offers=[...(data.available||[]),...(data.upcoming||[])];
      const fresh=offers.find((job:DeliveryJob)=>{const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus;let stored=false;try{stored=sessionStorage.getItem("paustik-offer:"+key)==="seen";}catch{}return !seen.current.has(key)&&!stored&&(!initialOffers.current||Date.now()-new Date(job.alertAt).getTime()<600000);});
      for(const job of offers){const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus;seen.current.add(key);try{sessionStorage.setItem("paustik-offer:"+key,"seen");}catch{}}
      if(initialOffers.current)setMealCapacity(data.capacity?.mealCapacity||6);
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
  async function availability(online:boolean,selectedZone?:string){setAreaBusy(true);setMessage("");try{let payload:object={isAvailable:false};if(online&&selectedZone){payload={isAvailable:true,zoneId:selectedZone,city:jobs.zones?.find(zone=>zone.id===selectedZone)?.city||city,radiusKm:radius,mealCapacity,consent:true};}else if(online){if(city.trim().length<2)throw new Error("Enter the city shown on your nearby kitchens.");const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}):reject(new Error("GPS is unavailable.")));payload={isAvailable:true,city,latitude:position.coords.latitude,longitude:position.coords.longitude,radiusKm:radius,consent:true,mealCapacity};}const r=await fetch("/api/delivery/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Availability could not save.");await refresh();setMessage(d.message);}catch(e){setMessage(e instanceof Error?e.message:"Location permission is needed to go online.");}finally{setAreaBusy(false);}}
  async function reviewBatch() {
    setMessage("");
    try {
      const response=await fetch("/api/delivery/batch-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deliveryIds:selectedJobs})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setBatchPreview(data);
    } catch(cause) { setBatchPreview(null);setMessage(cause instanceof Error?cause.message:"Batch could not be reviewed."); }
  }
  async function claim(job: DeliveryJob, ids?: string[]) {
    setBusyId(job.deliveryId);
    setMessage("");
    try {
      const response = await fetch("/api/delivery/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { deliveryIds: ids } : { deliveryId: job.deliveryId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not accept this delivery.");
      setOffer(null);setSelectedJobs([]);window.dispatchEvent(new Event("paustik-income-updated"));
      setMessage("Batch accepted. Collect each order, then start your delivery route. Use the kitchen/customer code or GPS to confirm handovers.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept this delivery.");
    } finally {
      setBusyId("");
    }
  }

  async function advance(job: DeliveryJob, method: "OTP"|"GPS" = "GPS") {
    const next = nextAction[job.deliveryStatus];
    if (!next) return;
    setBusyId(job.deliveryId);
    setMessage("");
    try {
      const response = await fetch("/api/delivery/jobs/" + job.deliveryId, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next.status, method, ...(method === "OTP" ? { otp: handoverCodes[job.deliveryId] || "" } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the delivery.");
      if (next.status === "DELIVERED") { assignedJobs.current=assignedJobs.current.filter(item=>item.deliveryId!==job.deliveryId); if(!assignedJobs.current.length)stopLocalWatch(); else setWatchingId(assignedJobs.current[0].deliveryId); }
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
        const responses = await Promise.all(assignedJobs.current.map(async current => {
        const response = await fetch("/api/delivery/jobs/" + current.deliveryId + "/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, sharingConsent: true }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "GPS update was not accepted.");
        return data; }));
        if(!responses.length)return;
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
      const ids = [...new Set([job.deliveryId, ...assignedJobs.current.map(item => item.deliveryId)])];
      const responses = await Promise.all(ids.map(async id => {
        const response = await fetch("/api/delivery/jobs/" + id + "/location", { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not stop location sharing.");
      }));
      void responses;
      setGpsState("Location sharing stopped. A fresh fix is required for geofence handover steps.");
      await refresh();
    } catch (error) {
      setGpsState(error instanceof Error ? error.message : "Could not stop location sharing.");
    }
  }

  if (loading) return <div className="dashboard-banner">Loading delivery board…</div>;
  return <div className="delivery-workspace">
    <section className="courier-availability"><div><span className="eyebrow">Your neighbourhood</span><h2>{jobs.area?.online?"Online for nearby offers":"Go online for delivery offers"}</h2><p>Choose a neighbourhood zone or use GPS, then set your 5–10 km service area. Nearby ready orders can be accepted in a batch of up to three.</p></div><label>Neighbourhood zone<select value={zoneId} onChange={e=>setZoneId(e.target.value)}><option value="">Choose a nearby kitchen area</option>{jobs.zones?.map(zone=><option key={zone.id} value={zone.id}>{zone.locality}, {zone.city} · {zone.name}</option>)}</select></label><button type="button" className="button" disabled={areaBusy||!zoneId} onClick={()=>void availability(true,zoneId)}>Go online in this neighbourhood</button><label>Service city<input value={city} onChange={e=>setCity(e.target.value)} maxLength={100} placeholder="e.g. Bhubaneswar"/></label><label>Radius<select value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} km</option>)}</select></label><label>Carrying capacity · meal units<input type="number" min={1} max={30} value={mealCapacity} onChange={e=>setMealCapacity(Number(e.target.value))}/></label><button className="button" type="button" disabled={areaBusy} onClick={()=>void availability(true)}>{areaBusy?"Updating…":jobs.area?.online?"Update my service area":"Go online using my location"}</button>{jobs.area?.online&&<button className="plain-button" onClick={()=>void availability(false)} disabled={areaBusy}>Go offline</button>}</section>
    <section className="courier-batch-summary"><h2>Your collection batch</h2>{jobs.capacity?.arrangedBulk ? <p>Arranged bulk delivery · {jobs.capacity.activeMeals} meal units · use the vehicle agreed with operations.</p> : <><p>{jobs.capacity?.activeOrders??0} / 3 orders · {jobs.capacity?.activeMeals??0} / {jobs.capacity?.mealCapacity??mealCapacity} meal units</p><p>Collect all orders first. Nearby pickups and drop-offs must fit a 2 km cluster and a 30-minute delivery window.</p></>}<ol>{jobs.route?.map((stop,index)=><li key={stop.kind+stop.id}>{index+1}. {stop.kind==="PICKUP"?"Collect":"Deliver"} · {jobs.assigned.find(job=>job.deliveryId===stop.id)?.orderNumber}</li>)}</ol></section><PartnerIncomePanel role="DELIVERY_AGENT"/>
    <dialog ref={modal} className="delivery-offer-dialog" onCancel={()=>setOffer(null)} aria-labelledby="delivery-offer-title">{offer&&<><button className="offer-close" type="button" aria-label="Close delivery offer" onClick={()=>setOffer(null)}>×</button><span className="eyebrow">{offer.isUpcoming?"New nearby order":"Ready for pickup"}</span><h2 id="delivery-offer-title">{offer.isUpcoming?"An upcoming delivery nearby":"New delivery request"}</h2><strong className="offer-pay">{incomeMoney(offer.estimatedPay)}<small>estimated courier pay</small></strong><p>{offer.pickup}</p><small>Drop-off area: {offer.dropoff}</small><p>{new Date(offer.scheduledFor).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</p><small>{offer.routeDistanceKm===null?"Distance not available":offer.routeDistanceKm.toFixed(1)+" km straight-line estimate"}. Final route and settlement can differ.</small>{offer.isUpcoming?<p>The kitchen is confirming or preparing this order. You can accept once it is ready.</p>:<button className="button" type="button" disabled={busyId===offer.deliveryId} onClick={()=>void claim(offer)}>{busyId===offer.deliveryId?"Accepting…":"Accept delivery"}</button>}<button className="plain-button" type="button" onClick={()=>setOffer(null)}>Not now</button></>}</dialog>
    <section className="delivery-privacy-note"><strong>GPS is opt-in.</strong> Your location is shared with the customer only while the order is picked up or out for delivery. Paustik stores one latest point and clears it at handover or when you stop sharing.</section>
    {message && <p className="workspace-message" role="status">{message}</p>}
    <section className="delivery-jobs-grid" id="delivery-jobs">
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow">Ready nearby</span><h2 id="available-jobs">Available deliveries</h2></div><span className="customer-count">{jobs.available.length}</span></div>
        {selectedJobs.length>0&&<button className="button" type="button" disabled={Boolean(busyId)} onClick={()=>void reviewBatch()}>Review collection batch · {selectedJobs.length} orders</button>}{batchPreview&&JSON.stringify(batchPreview.deliveryIds)===JSON.stringify(selectedJobs)&&<div className="courier-batch-summary"><h3>Review your route before accepting</h3><p>{batchPreview.meals} meal units · Additional estimated earnings {incomeMoney(batchPreview.estimate)}</p><ol>{batchPreview.route.map((stop,index)=><li key={index}>{stop.kind} · {stop.orderNumber} · {stop.area}</li>)}</ol><button className="button" type="button" disabled={Boolean(busyId)} onClick={()=>{const job=jobs.available.find(j=>j.deliveryId===selectedJobs[0]);if(job)void claim(job,selectedJobs);}}>Accept reviewed batch</button></div>}{jobs.available.length ? <div className="workspace-record-list">{jobs.available.map((job) => <article key={job.deliveryId}>
          <label className="batch-select"><input type="checkbox" checked={selectedJobs.includes(job.deliveryId)} disabled={Boolean(busyId)||(!selectedJobs.includes(job.deliveryId)&&selectedJobs.length>=3)} onChange={e=>setSelectedJobs(current=>e.target.checked?[...current,job.deliveryId]:current.filter(id=>id!==job.deliveryId))}/> Add to collection batch</label><div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active"><UiText text="Ready for pickup"/></span></div>
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
            {next && ["GOING_TO_PICKUP","OUT_FOR_DELIVERY"].includes(job.deliveryStatus) ? <div className="courier-handover"><label>{job.deliveryStatus==="GOING_TO_PICKUP"?"Kitchen pickup code":"Customer delivery code"}<input aria-label={job.orderNumber+" handover code"} inputMode="numeric" maxLength={6} value={handoverCodes[job.deliveryId]||""} onChange={e=>setHandoverCodes(current=>({...current,[job.deliveryId]:e.target.value.replace(/\D/g,"")}))}/></label><button type="button" className="button" disabled={busyId===job.deliveryId||!/^\d{6}$/.test(handoverCodes[job.deliveryId]||"")} onClick={()=>void advance(job,"OTP")}>Verify code & {job.deliveryStatus==="GOING_TO_PICKUP"?"collect":"complete"}</button>{(job.deliveryStatus==="GOING_TO_PICKUP"||jobs.dispatch?.allowGpsHandover)&&<button type="button" className="button button-quiet" disabled={busyId===job.deliveryId} onClick={()=>void advance(job,"GPS")}>Confirm using nearby GPS</button>}</div> : next && job.deliveryStatus !== "ACCEPTED" && <button type="button" className="button button-small" onClick={() => advance(job)} disabled={busyId === job.deliveryId}>{busyId === job.deliveryId ? "Saving…" : next.label}</button>}
          </article>;
        })}</div> : <div className="customer-empty-state"><strong>No delivery assigned</strong><span>Accept a job when you are ready to take it.</span></div>}
      </article>
    </section>
    {jobs.upcoming.length>0&&<section className="dashboard-card"><div className="workspace-section-heading"><h2>Upcoming nearby pickups</h2><span className="customer-count">{jobs.upcoming.length}</span></div><p>Heads-up only. These are not accepted jobs or guaranteed income.</p><div className="workspace-record-list">{jobs.upcoming.map(job=><article key={job.orderId}><div className="workspace-record-head"><strong>{job.pickup}</strong><b className="courier-job-pay">{incomeMoney(job.estimatedPay)} estimate</b></div><small>{new Date(job.scheduledFor).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · {job.orderStatus.toLowerCase().replaceAll("_"," ")}</small><button className="plain-button" onClick={()=>setOffer(job)}>View upcoming offer</button></article>)}</div></section>}
    <p className="dashboard-banner">Pickup GPS uses 150 m. Delivery GPS uses the operations setting, normally 100 m. Handover codes work when GPS is unavailable. Contact operations for a recorded exception.</p>
  </div>;
}
