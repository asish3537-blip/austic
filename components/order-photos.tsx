"use client";
/* eslint-disable @next/next/no-img-element -- Order evidence is private and must not enter the public image cache. */
import {useCallback,useEffect,useState} from "react";
import {UiText,useUiLanguage} from "@/components/ui-language";
import {ORDER_PHOTO_STAGES,type OrderPhotoStage} from "@/lib/order-photo-policy";
type Photo={stage:OrderPhotoStage;createdAt:string;url:string};
type PhotoData={photos:Photo[];allowed:Record<OrderPhotoStage,boolean>};

async function resizePhoto(file:File){
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error("Choose a JPG, PNG or WebP under 5 MB.");
 const bitmap=await createImageBitmap(file);
 try{let dimension=640;while(dimension>=160){const scale=Math.min(1,dimension/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Photo upload is unavailable on this device.");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const image=canvas.toDataURL("image/png");if(image.length<=260000)return image;dimension=Math.floor(dimension*.8);}throw new Error("Choose a smaller photo.");}finally{bitmap.close();}
}

export function OrderPhotos({orderId,writable=false,pilot=false,initiallyOpen=false}:{orderId:string;writable?:boolean;pilot?:boolean;initiallyOpen?:boolean}){
 const {t}=useUiLanguage();
 const [open,setOpen]=useState(initiallyOpen),[data,setData]=useState<PhotoData|null>(null),[busy,setBusy]=useState<OrderPhotoStage|null>(null),[message,setMessage]=useState("");
 const url="/api/order-photos?orderId="+orderId+(pilot?"&pilot=1":"");
 const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch(url,{cache:"no-store",signal});const d=await r.json();if(!r.ok)throw new Error(d.error||"Order photos could not load.");setData(d);},[url]);
 useEffect(()=>{if(!open)return;const c=new AbortController();void fetch(url,{cache:"no-store",signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Order photos could not load.");return d;}).then(d=>{if(!c.signal.aborted)setData(d);}).catch(e=>{if(!c.signal.aborted)setMessage(e.message);});return()=>c.abort();},[open,url]);
 async function upload(stage:OrderPhotoStage,file:File){setBusy(stage);setMessage("");try{const image=await resizePhoto(file);const r=await fetch("/api/order-photos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,pilot,stage,image})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Photo could not save.");await refresh();setMessage("Order photo saved.");}catch(e){setMessage(e instanceof Error?e.message:"Photo could not save.");}finally{setBusy(null);}}
 return <details className="order-photo-panel" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary><UiText text="Meal & handover photos"/><span>{data?data.photos.length:"—"} / 2</span></summary>{open&&<><p><UiText text={writable?"Add one photo after cooking and one when handing the packed meal to the courier. Show the food and packaging, without faces or address labels.":"Photos uploaded by your Mother Kitchen after cooking and at courier handover."}/></p><div className="order-photo-slots">{ORDER_PHOTO_STAGES.map(stage=>{const photo=data?.photos.find(p=>p.stage===stage),allowed=writable&&data?.allowed[stage];return <article key={stage}><strong><UiText text={stage==="PREPARED"?"1. Prepared meal":"2. Courier handover"}/></strong>{photo?<a href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={t(stage==="PREPARED"?"1. Prepared meal":"2. Courier handover")} width={240} height={160}/></a>:<div className="order-photo-placeholder" aria-hidden="true">▧</div>}{allowed?<label className="order-photo-picker"><UiText text={busy===stage?"Saving photo…":photo?"Replace photo":"Take or upload photo"}/><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy!==null} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(stage,file);e.target.value="";}}/></label>:<small><UiText text={photo?"Photo added":!data?"Loading photos…":writable?stage==="PREPARED"?"Available after cooking starts.":"Available when the meal is ready for pickup.":"Photo not added yet."}/></small>}</article>;})}</div>{message&&<p role="status"><UiText text={message}/></p>}</>}</details>;
}
