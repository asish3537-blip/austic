"use client";
/* eslint-disable @next/next/no-img-element -- Private order evidence must bypass public image caches. */
import {useEffect,useState} from "react";
import {UiText,UiDate,useUiLanguage} from "@/components/ui-language";
import {orderTimeline} from "@/lib/order-timeline";
type Photo={stage:string;createdAt:string;url:string};
export function OrderProgressPanel(props:Parameters<typeof OrderProgress>[0]){
 const [open,setOpen]=useState(false);
 return <details open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary><UiText text="Order progress"/></summary>{open&&<OrderProgress {...props}/>}</details>;
}
export function OrderProgress({orderId,status,events,pilot=false}:{orderId:string;status:string;events:{status:string;at:string}[];pilot?:boolean}){
 const {t}=useUiLanguage();
 const [photos,setPhotos]=useState<Photo[]|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();
  void fetch("/api/order-photos?orderId="+encodeURIComponent(orderId)+(pilot?"&pilot=1":""),{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{if(!controller.signal.aborted){setPhotos(data.photos);setError(false);}}).catch(()=>{if(!controller.signal.aborted)setError(true);});
  return()=>controller.abort();
 },[orderId,revision,events,pilot]);
 return <section aria-label={t("Order progress")} className="order-progress"><ol>{orderTimeline(status,events).map(step=>{
  const photoStage="photo" in step?step.photo:undefined,photo=photos?.find(p=>p.stage===photoStage);
  return <li key={step.status} data-state={step.state} aria-current={step.state==="current"?"step":undefined}>
   <strong><UiText text={step.label}/></strong><small><UiText text={step.state==="current"?"Current stage":step.state==="recorded"?"Update received":step.state==="passed"?"Earlier stage":step.state==="stopped"?"Not reached":"Awaiting update"}/></small>
   {step.at&&<time dateTime={step.at}><UiDate value={step.at}/> <UiText text="IST"/></time>}
   {photoStage&&<div className="timeline-photo"><span><UiText text={photoStage==="PREPARED"?"Prepared meal photo":"Courier handover photo"}/></span>
    {photo?<><a href={photo.url} target="_blank" rel="noopener noreferrer"><img key={revision+photo.url} src={photo.url} alt={t(photoStage==="PREPARED"?"Prepared meal photo":"Courier handover photo")} width={320} height={220} onError={()=>setError(true)}/></a><small><UiText text="Uploaded"/> <UiDate value={photo.createdAt}/> <UiText text="IST"/></small></>:<p><UiText text={error?"Photos could not load. Retry below.":photos?"Not uploaded yet":"Loading photos…"}/></p>}
   </div>}
  </li>;
 })}</ol>{error&&<p role="status"><UiText text="Photos could not load. Retry below."/></p>}<button type="button" className="button button-small" onClick={()=>setRevision(n=>n+1)}><UiText text="Refresh photos"/></button><p className="timeline-photo-note"><UiText text="Photos are kitchen uploads, not independent food-safety verification. A photo does not change the order status."/></p></section>;
}
