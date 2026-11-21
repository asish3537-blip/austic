"use client";

import Link from "next/link";
import {AppIcon} from "@/components/app-icon";
import { PartnerIncomePanel } from "@/components/partner-income-panel";
import { incomeMoney, type EstimatePolicy } from "@/lib/earnings-estimates";
import { UiText,useUiLanguage } from "@/components/ui-language";
import { useCallback, useEffect, useRef, useState } from "react";

type DeliveryJob = {
  estimatedPay:number;routeDistanceKm:number|null;alertAt:string;isUpcoming?:boolean;
  deliveryId: string; orderId: string; orderNumber: string; deliveryStatus: string; orderStatus: string;
  trackingReference: string | null; pickup: string; dropoff: string; items: string[]; scheduledFor: string;
  pickupPinned: boolean; dropoffPinned: boolean; isSharingLocation: boolean;
  pickupNavigation: string | null; dropoffNavigation: string | null;
};
type Jobs = { available: DeliveryJob[]; assigned: DeliveryJob[]; upcoming:DeliveryJob[];userScope?:string;area?:{online:boolean;city:string;radiusKm:number;pin?:{latitude:number;longitude:number}|null;pickupsOpen?:boolean};zones?:{id:string;name:string;locality:string;city:string}[];policy?:EstimatePolicy;dispatch?:{handoverRadiusMeters:number;allowGpsHandover:boolean};capacity?:{arrangedBulk?:boolean;maxOrders:number;mealCapacity:number;activeOrders:number;activeMeals:number};route?:{id:string;kind:string}[] };
const nextAction: Record<string, { status: string; label: string }> = {
  ACCEPTED: { status: "GOING_TO_PICKUP", label: "Head to pickup" },
  GOING_TO_PICKUP: { status: "PICKED_UP", label: "Confirm pickup" },
  PICKED_UP: { status: "OUT_FOR_DELIVERY", label: "Start delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Confirm delivered" },
};

export function DeliveryWorkspace() {
  const {language}=useUiLanguage();
  const copy=(en:string,hi:string,or:string)=>language==="hi"?hi:language==="or"?or:en;
  const [jobs, setJobs] = useState<Jobs>({ available: [], assigned: [], upcoming:[] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [watchingId, setWatchingId] = useState("");
  const [gpsState, setGpsState] = useState("");
  const [offer,setOffer]=useState<DeliveryJob|null>(null);
  const [offerError,setOfferError]=useState("");
  const requestedOfferHandled=useRef(false);
  const assignedJobs = useRef<DeliveryJob[]>([]);
  const [batchPreview,setBatchPreview]=useState<{deliveryIds:string[];meals:number;estimate:number;route:{kind:string;orderNumber:string;area:string}[]}|null>(null);
  const [selectedJobs,setSelectedJobs]=useState<string[]>([]);
  const mealCapacity=jobs.capacity?.mealCapacity??6;
  const [handoverCodes,setHandoverCodes]=useState<Record<string,string>>({});
  const [areaMessage,setAreaMessage]=useState("");const [areaBusy,setAreaBusy]=useState(false);
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
      const offers=[...(data.available||[]),...(data.assigned||[]).filter((job:DeliveryJob)=>job.deliveryStatus==="ASSIGNED"),...(data.upcoming||[])];
      const requestedId=!requestedOfferHandled.current?new URLSearchParams(window.location.search).get("offer"):null;
      const requested=requestedId?offers.find((job:DeliveryJob)=>job.orderId===requestedId):null;
      requestedOfferHandled.current=true;
      const fresh=offers.find((job:DeliveryJob)=>{const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus+":"+(job.orderStatus==="READY_FOR_PICKUP"?"ready":"scheduled");let stored=false;try{stored=sessionStorage.getItem("paustik-offer:"+key)==="seen";}catch{}return !seen.current.has(key)&&!stored&&(!initialOffers.current||Date.now()-new Date(job.alertAt).getTime()<600000);});
      for(const job of offers){const key=data.userScope+":"+job.deliveryId+":"+job.deliveryStatus+":"+(job.orderStatus==="READY_FOR_PICKUP"?"ready":"scheduled");seen.current.add(key);try{sessionStorage.setItem("paustik-offer:"+key,"seen");}catch{}}
      initialOffers.current=false;
      setOffer(current=>requested||(current?(offers.find((j:DeliveryJob)=>j.orderId===current.orderId)||fresh||null):(fresh||null)));
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
  async function availability(online:boolean){
    setAreaBusy(true);setAreaMessage("");
    try{
      const r=await fetch("/api/delivery/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(online?{isAvailable:true,useSavedPin:true,radiusKm:jobs.area?.radiusKm||25,mealCapacity,consent:true}:{isAvailable:false})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Availability could not save.");await refresh();
    }catch(e){setAreaMessage(e instanceof Error?e.message:"Availability could not save.");}finally{setAreaBusy(false);}
  }
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
    setOfferError("");
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
      setOfferError(error instanceof Error ? error.message : "Could not accept this delivery.");
    } finally {
      setBusyId("");
    }
  }

  async function decline(job:DeliveryJob){
    setBusyId(job.deliveryId);setOfferError("");
    try{
      const r=await fetch("/api/delivery/offers/decline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:job.orderId})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not decline this offer.");
      setOffer(null);setSelectedJobs(current=>current.filter(id=>id!==job.deliveryId));setBatchPreview(null);
      await refresh();
      setMessage(copy("Delivery offer declined. The order remains available to other couriers.","डिलीवरी प्रस्ताव अस्वीकार किया। ऑर्डर दूसरे डिलीवरी साथियों के लिए उपलब्ध है।","ଡେଲିଭରି ପ୍ରସ୍ତାବ ଅସ୍ୱୀକାର କରାଗଲା। ଅର୍ଡର ଅନ୍ୟ ଡେଲିଭରି ସାଥୀଙ୍କ ପାଇଁ ଉପଲବ୍ଧ ରହିବ।"));
      window.dispatchEvent(new Event("paustik-notifications-changed"));
    }catch(error){const text=error instanceof Error?error.message:"Could not decline this offer.";setOfferError(text);setMessage(text);}
    finally{setBusyId("");}
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

  if (loading) return <div className="dashboard-banner"><UiText text="Loading delivery board…"/></div>;
  return <div className="delivery-workspace">{message && <p className="workspace-message" role="status"><UiText text={message}/></p>}
    <section className="courier-status-bar"><div><span className="courier-online-dot" data-online={jobs.area?.online?"true":"false"}/><strong><UiText text={areaBusy?"Updating…":jobs.area?.online?"Online for nearby offers":"Offline for new offers"}/></strong><small>{jobs.area?.pin?<>{jobs.area.city} · {jobs.area.radiusKm} <UiText text="km radius."/></>:copy("Save a pickup area in Settings.","सेटिंग्स में पिकअप क्षेत्र सहेजें।","ସେଟିଂସ୍‌ରେ ପିକ୍‌ଅପ୍ ଅଞ୍ଚଳ ସେଭ୍ କରନ୍ତୁ।")}</small></div><div className="courier-status-actions">{jobs.area?.online?<button type="button" className="button button-small" disabled={areaBusy} onClick={()=>void availability(false)}><UiText text="Go offline"/></button>:jobs.area?.pin?<button type="button" className="button button-small" disabled={areaBusy} onClick={()=>void availability(true)}>{copy("Go online","ऑनलाइन जाएँ","ଅନ୍‌ଲାଇନ୍ ହୁଅନ୍ତୁ")}</button>:null}<Link href="/account/settings#delivery-preferences"><UiText text="Settings"/> →</Link></div>{areaMessage&&<p role="status"><UiText text={areaMessage}/></p>}</section>
    <PartnerIncomePanel role="DELIVERY_AGENT" compact/><section className="delivery-jobs-grid" id="delivery-jobs">
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Your route"/></span><h2 id="delivery-route"><UiText text="Assigned deliveries"/></h2></div><span className="customer-count">{jobs.assigned.length}</span></div>
        {jobs.assigned.length ? <div className="workspace-record-list">{jobs.assigned.map((job) => {
          const next = nextAction[job.deliveryStatus];
          return <article key={job.deliveryId}>
            <div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active"><UiText text={job.deliveryStatus.toLowerCase().replaceAll("_", " ")}/></span></div>
            <p>{job.items.join(", ")}</p><strong className="courier-job-pay">{incomeMoney(job.estimatedPay)} <UiText text="accepted estimate"/></strong><small><UiText text="Pickup:"/>{job.pickup} <UiText text="· Drop-off:"/>{job.dropoff}</small>
            <div className="delivery-pin-status"><span><UiText text={job.pickupPinned ? "Pickup geofence ready" : "Pickup pin missing"}/></span><span><UiText text={job.dropoffPinned ? "Drop-off geofence ready" : "Drop-off pin missing"}/></span></div>
            <div className="delivery-location-actions">
              {job.deliveryStatus==="ASSIGNED"&&(job.orderStatus==="READY_FOR_PICKUP"?<button type="button" className="button" disabled={Boolean(busyId)||jobs.area?.pickupsOpen===false||!jobs.area?.online} onClick={()=>void claim(job)}><UiText text="Accept delivery"/></button>:<p><UiText text="The kitchen is confirming or preparing this order. You can accept once it is ready."/></p>)}{job.deliveryStatus==="ASSIGNED"&&<button type="button" className="button button-quiet offer-decline" disabled={Boolean(busyId)} onClick={()=>void decline(job)}><UiText text="Decline"/></button>}{job.deliveryStatus === "ACCEPTED" && <button type="button" className="button button-quiet" onClick={() => advance(job)} disabled={busyId === job.deliveryId}><UiText text={busyId === job.deliveryId ? "Saving…" : "Head to pickup"}/></button>}
            {next && ["GOING_TO_PICKUP","OUT_FOR_DELIVERY"].includes(job.deliveryStatus) ? <div className="courier-handover"><label><UiText text={job.deliveryStatus==="GOING_TO_PICKUP"?"Kitchen pickup code":"Customer delivery code"}/><input aria-label={job.orderNumber+" handover code"} inputMode="numeric" maxLength={6} value={handoverCodes[job.deliveryId]||""} onChange={e=>setHandoverCodes(current=>({...current,[job.deliveryId]:e.target.value.replace(/\D/g,"")}))}/></label><button type="button" className="button" disabled={busyId===job.deliveryId||!/^\d{6}$/.test(handoverCodes[job.deliveryId]||"")} onClick={()=>void advance(job,"OTP")}><UiText text="Verify code &"/> <UiText text={job.deliveryStatus==="GOING_TO_PICKUP"?"collect":"complete"}/></button>{(job.deliveryStatus==="GOING_TO_PICKUP"||jobs.dispatch?.allowGpsHandover)&&<button type="button" className="button button-quiet" disabled={busyId===job.deliveryId} onClick={()=>void advance(job,"GPS")}><UiText text="Confirm using nearby GPS"/></button>}</div> : next && job.deliveryStatus !== "ACCEPTED" && <button type="button" className="button button-small" onClick={() => advance(job)} disabled={busyId === job.deliveryId}><UiText text={busyId === job.deliveryId ? "Saving…" : next.label}/></button>}
            {job.pickupNavigation && <a className="button button-quiet" href={`https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: job.pickupNavigation, dir_action: "navigate" })}`} target="_blank" rel="noopener noreferrer"><UiText text="Google Maps · Kitchen ↗"/></a>}
              {job.dropoffNavigation && <a className="button button-quiet" href={`https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: job.dropoffNavigation, dir_action: "navigate" })}`} target="_blank" rel="noopener noreferrer"><UiText text="Google Maps · Customer ↗"/></a>}
            </div>
            <small><UiText text="Opening a route shares its destination with Google Maps. Confirm the address before travelling. Navigation does not mark pickup or delivery complete. Keep Paustik open for location updates; background tracking may pause."/></small>
            {job.deliveryStatus !== "DELIVERED" && <div className="delivery-location-actions">
              {watchingId === job.deliveryId ? <button type="button" className="button button-quiet" onClick={() => stopLocation(job)}><UiText text="Stop sharing"/></button> : <button type="button" className="button button-quiet" onClick={() => startLocation(job)}><UiText text={job.isSharingLocation ? "Resume location sharing" : "Start location sharing"}/></button>}
              {job.isSharingLocation && watchingId !== job.deliveryId && <button type="button" className="delivery-revoke-button" onClick={() => stopLocation(job)}><UiText text="Revoke location sharing"/></button>}
              {watchingId === job.deliveryId && <small>{gpsState || "Waiting for GPS…"}</small>}
            </div>}

          </article>;
        })}</div> : <div className="customer-empty-state"><strong><UiText text="No delivery assigned"/></strong><span><UiText text="Accept a job when you are ready to take it."/></span></div>}
      </article>
      <article className="dashboard-card">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Ready nearby"/></span><h2 id="available-jobs"><UiText text="Available deliveries"/></h2></div><span className="customer-count">{jobs.available.length}</span></div>
        {selectedJobs.length>0&&<button className="button" type="button" disabled={Boolean(busyId)} onClick={()=>void reviewBatch()}><UiText text="Review collection batch ·"/>{selectedJobs.length} <UiText text="orders"/></button>}{batchPreview&&JSON.stringify(batchPreview.deliveryIds)===JSON.stringify(selectedJobs)&&<div className="courier-batch-summary"><h3><UiText text="Review your route before accepting"/></h3><p>{batchPreview.meals} <UiText text="meal units · Additional estimated earnings"/>{incomeMoney(batchPreview.estimate)}</p><ol>{batchPreview.route.map((stop,index)=><li key={index}>{stop.kind} · {stop.orderNumber} · {stop.area}</li>)}</ol><button className="button" type="button" disabled={Boolean(busyId)} onClick={()=>{const job=jobs.available.find(j=>j.deliveryId===selectedJobs[0]);if(job)void claim(job,selectedJobs);}}><UiText text="Accept reviewed batch"/></button></div>}{jobs.available.length ? <div className="workspace-record-list">{jobs.available.map((job) => <article key={job.deliveryId}>
          <label className="batch-select"><input type="checkbox" checked={selectedJobs.includes(job.deliveryId)} disabled={Boolean(busyId)||(!selectedJobs.includes(job.deliveryId)&&selectedJobs.length>=3)} onChange={e=>setSelectedJobs(current=>e.target.checked?[...current,job.deliveryId]:current.filter(id=>id!==job.deliveryId))}/> <UiText text="Add to collection batch"/></label><div className="workspace-record-head"><strong>{job.orderNumber}</strong><span className="customer-status customer-status-active"><UiText text="Ready for pickup"/></span></div>
          <p>{job.items.join(", ")}</p><strong className="courier-job-pay">{incomeMoney(job.estimatedPay)} <UiText text="estimated pay"/></strong><small><UiText text="Pickup:"/>{job.pickup} <UiText text="· Drop-off:"/>{job.dropoff}</small>
          <button className="button button-small" type="button" onClick={() => claim(job)} disabled={busyId === job.deliveryId}><UiText text={busyId === job.deliveryId ? "Accepting…" : "Accept delivery"}/></button><button className="button button-quiet offer-decline" type="button" disabled={Boolean(busyId)} onClick={()=>void decline(job)}><UiText text="Decline"/></button>
        </article>)}</div> : <div className="customer-empty-state"><strong><UiText text="No ready jobs nearby"/></strong><span><UiText text={!jobs.area?.online?"Go online with your location to receive offers.":jobs.area?.pickupsOpen===false?"New pickups are available from 06:00 to 20:30 IST. Your assigned deliveries remain below.":"No unassigned orders are ready within your saved area. Preparing orders appear under Upcoming; kitchen readiness is required before accepting."}/></span></div>}
      </article>
    </section>

    <section className="dashboard-card courier-scheduled-panel"><div className="workspace-section-heading"><h2><UiText text="Scheduled & preparing deliveries"/></h2><span className="customer-count">{jobs.upcoming.length}</span></div>{jobs.upcoming.length>0&&<p><UiText text="Booked orders appear here before the kitchen marks them ready. Accept delivery becomes available when ready."/></p>}{!jobs.upcoming.length&&<p className="courier-scheduled-empty"><UiText text="No scheduled deliveries yet. Published menus become jobs only after a customer books."/></p>}<div className="workspace-record-list">{jobs.upcoming.map(job=><article key={job.orderId}><div className="workspace-record-head"><strong>{job.pickup}</strong><b className="courier-job-pay">{incomeMoney(job.estimatedPay)} <UiText text="estimate"/></b></div><small>{new Date(job.scheduledFor).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} <UiText text="IST ·"/>{job.orderStatus.toLowerCase().replaceAll("_"," ")}</small><button className="plain-button" onClick={()=>{setOfferError("");setOffer(job);}}><UiText text="View upcoming offer"/></button></article>)}</div></section>
    <section className="courier-school-card"><span className="courier-school-icon" aria-hidden="true"><AppIcon name="school"/></span><div><strong>ScooFoo</strong><p>{copy("Dedicated home-to-school tiffin pickups.","घर से स्कूल टिफिन के लिए अलग पिकअप।","ଘରୁ ସ୍କୁଲ୍ ଟିଫିନ୍ ପାଇଁ ଅଲଗା ପିକ୍‌ଅପ୍।")}</p></div><Link className="button button-quiet" href="/school-tiffins">{copy("School pickups →","स्कूल पिकअप →","ସ୍କୁଲ୍ ପିକ୍‌ଅପ୍ →")}</Link></section>
    {Boolean(jobs.capacity?.activeOrders)&&<section className="courier-batch-summary"><h2><UiText text="Your collection batch"/></h2>{jobs.capacity?.arrangedBulk ? <p><UiText text="Arranged bulk delivery ·"/>{jobs.capacity.activeMeals} <UiText text="meal units · use the vehicle agreed with operations."/></p> : <><p>{jobs.capacity?.activeOrders??0} <UiText text="/ 3 orders ·"/>{jobs.capacity?.activeMeals??0} / {jobs.capacity?.mealCapacity??mealCapacity} <UiText text="meal units"/></p><p><UiText text="Collect all orders first. Nearby pickups and drop-offs must fit a 2 km cluster and a 30-minute delivery window."/></p></>}<ol>{jobs.route?.map((stop,index)=><li key={stop.kind+stop.id}>{index+1}. <UiText text={stop.kind==="PICKUP"?"Collect":"Deliver"}/> · {jobs.assigned.find(job=>job.deliveryId===stop.id)?.orderNumber}</li>)}</ol></section>}
    <dialog ref={modal} className="delivery-offer-dialog" onCancel={e=>{if(busyId)e.preventDefault();else setOffer(null);}} aria-labelledby="delivery-offer-title">{offer&&<>
      <button className="offer-close" type="button" aria-label="Close delivery offer" disabled={Boolean(busyId)} onClick={()=>setOffer(null)}>×</button>
      <span className="eyebrow"><UiText text={offer.isUpcoming?"New nearby order":"Ready for pickup"}/></span>
      <h2 id="delivery-offer-title"><UiText text={offer.isUpcoming?"An upcoming delivery nearby":"New delivery request"}/></h2>
      <strong className="offer-pay">{incomeMoney(offer.estimatedPay)}<small><UiText text="estimated courier pay"/></small></strong>
      <p>{offer.pickup}</p><small><UiText text="Drop-off area:"/>{offer.dropoff}</small>
      <p>{new Date(offer.scheduledFor).toLocaleString(language==="or"?"or-IN":language==="hi"?"hi-IN":"en-IN",{timeZone:"Asia/Kolkata"})} <UiText text="IST"/></p>
      <small>{offer.routeDistanceKm===null?copy("Distance not available","दूरी उपलब्ध नहीं","ଦୂରତା ଉପଲବ୍ଧ ନାହିଁ"):offer.routeDistanceKm.toFixed(1)+copy(" km straight-line estimate"," किमी सीधी दूरी का अनुमान"," କିମି ସିଧା ଦୂରତା ଆକଳନ")}<UiText text=". Final route and settlement can differ."/></small>
      {offer.isUpcoming&&<p><UiText text="The kitchen is confirming or preparing this order. You can accept once it is ready."/></p>}
      {offerError&&<p role="alert" className="offer-response-error">{offerError}</p>}
      <div className="delivery-offer-actions"><button className="button" type="button" disabled={Boolean(busyId)||Boolean(offer.isUpcoming)||jobs.area?.pickupsOpen===false||!jobs.area?.online} onClick={()=>void claim(offer)}><UiText text={busyId===offer.deliveryId?"Saving…":"Accept delivery"}/></button><button className="button button-quiet offer-decline" type="button" disabled={Boolean(busyId)} onClick={()=>void decline(offer)}><UiText text="Decline"/></button></div>
      <small>{copy("Decline skips this order for you. It does not cancel the customer's order.","अस्वीकार करने पर यह ऑर्डर आपको नहीं दिखेगा। ग्राहक का ऑर्डर रद्द नहीं होगा।","ଅସ୍ୱୀକାର କଲେ ଏହି ଅର୍ଡର ଆପଣଙ୍କୁ ଆଉ ଦେଖାଯିବ ନାହିଁ। ଗ୍ରାହକଙ୍କ ଅର୍ଡର ବାତିଲ ହେବ ନାହିଁ।")}</small>
    </>}</dialog>
    <section className="delivery-privacy-note"><strong><UiText text="GPS is opt-in."/></strong> <UiText text="Your location is shared with the customer only while the order is picked up or out for delivery. Paustik stores one latest point and clears it at handover or when you stop sharing."/></section>
    


    <p className="dashboard-banner"><UiText text="Pickup GPS uses 150 m. Delivery GPS uses the operations setting, normally 100 m. Handover codes work when GPS is unavailable. Contact operations for a recorded exception."/></p>
  </div>;
}
