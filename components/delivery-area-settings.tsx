"use client";
import {useEffect,useState} from "react";
import {UiText,useUiLanguage} from "@/components/ui-language";
type Area={radiusKm:number;pin?:{latitude:number;longitude:number}|null;city:string;online:boolean};
type Zone={id:string;name:string;locality:string;city:string};
export function DeliveryAreaSettings(){
 const {language}=useUiLanguage();const copy=(en:string,hi:string,or:string)=>language==="hi"?hi:language==="or"?or:en;
 const [area,setArea]=useState<Area|null>(null),[zones,setZones]=useState<Zone[]>([]),[radius,setRadius]=useState(25),[capacity,setCapacity]=useState(6),[zone,setZone]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;fetch("/api/delivery/jobs",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load delivery settings.");if(active){setArea(d.area);setZones(d.zones||[]);setRadius(d.area?.radiusKm||25);setCapacity(d.capacity?.mealCapacity||6);}}).catch(e=>{if(active)setMessage(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function save(method:"gps"|"zone"|"saved"){
  setBusy(true);setMessage("");
  try{
   let payload:object={isAvailable:true,useSavedPin:true,radiusKm:radius,mealCapacity:capacity,consent:true};
   if(method==="zone")payload={isAvailable:true,zoneId:zone,radiusKm:radius,mealCapacity:capacity,consent:true};
   if(method==="gps"){
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}):reject(new Error("GPS is unavailable. Choose a pickup area below.")));
    if(!Number.isFinite(position.coords.accuracy)||position.coords.accuracy>1000)throw new Error("Your location is too approximate. Enable precise location or choose a pickup area below.");
    payload={isAvailable:true,latitude:position.coords.latitude,longitude:position.coords.longitude,radiusKm:radius,mealCapacity:capacity,consent:true};
   }
   const r=await fetch("/api/delivery/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Availability could not save.");
   const fresh=await fetch("/api/delivery/jobs",{cache:"no-store"});if(fresh.ok){const data=await fresh.json();setArea(data.area);}
   setMessage(copy("Location saved. You are online for nearby offers.","स्थान सहेजा गया। आप पास के प्रस्तावों के लिए ऑनलाइन हैं।","ସ୍ଥାନ ସେଭ୍ ହେଲା। ପାଖାପାଖି ପ୍ରସ୍ତାବ ପାଇଁ ଆପଣ ଅନ୍‌ଲାଇନ୍ ଅଛନ୍ତି।"));
  }catch(e){setMessage(typeof e==="object"&&e!==null&&"code" in e?copy("Location could not be read. Allow GPS or choose a pickup area.","स्थान नहीं मिला। GPS की अनुमति दें या पिकअप क्षेत्र चुनें।","ସ୍ଥାନ ମିଳିଲା ନାହିଁ। GPS ଅନୁମତି ଦିଅନ୍ତୁ କିମ୍ବା ପିକ୍‌ଅପ୍ ଅଞ୍ଚଳ ବାଛନ୍ତୁ।"):e instanceof Error?e.message:"Availability could not save.");}finally{setBusy(false);}
 }
 return <section id="delivery-preferences" className="account-settings-card delivery-area-settings"><h2><UiText text="Your delivery area"/></h2><p>{copy("Set your pickup search area here. GPS runs only when you choose it; your dashboard uses the saved area.","अपना पिकअप क्षेत्र यहाँ तय करें। GPS केवल आपके चुनने पर चलेगा; डैशबोर्ड सहेजे हुए क्षेत्र का उपयोग करता है।","ଏଠାରେ ପିକ୍‌ଅପ୍ ଅଞ୍ଚଳ ବାଛନ୍ତୁ। ଆପଣ ବାଛିଲେ ହିଁ GPS ଚାଲିବ; ଡ୍ୟାସ୍‌ବୋର୍ଡ ସେଭ୍ ଅଞ୍ଚଳ ବ୍ୟବହାର କରେ।")}</p>{loading?<p><UiText text="Loading…"/></p>:<>
 <p>{area?.pin?<><UiText text="Saved pickup area:"/> {area.city} · {area.radiusKm} <UiText text="km radius."/></>:copy("No pickup area saved yet.","अभी पिकअप क्षेत्र सहेजा नहीं गया।","ଏପର୍ଯ୍ୟନ୍ତ ପିକ୍‌ଅପ୍ ଅଞ୍ଚଳ ସେଭ୍ ହୋଇନାହିଁ।")}</p>
 <div className="delivery-setting-fields"><label><UiText text="Pickup search radius"/><select value={radius} onChange={e=>setRadius(Number(e.target.value))} disabled={busy}>{Array.from({length:21},(_,i)=>i+5).map(n=><option key={n} value={n}>{n} km</option>)}</select></label><label><UiText text="Carrying capacity · meal units"/><input type="number" min={1} max={30} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} disabled={busy}/></label></div>
 <div className="delivery-settings-actions"><button type="button" className="button" disabled={busy||!Number.isInteger(capacity)||capacity<1||capacity>30} onClick={()=>void save("gps")}><UiText text={busy?"Updating location…":"Use current GPS"}/></button>{area?.pin&&<button type="button" className="button button-quiet" disabled={busy||!Number.isInteger(capacity)||capacity<1||capacity>30} onClick={()=>void save("saved")}><UiText text="Apply radius to saved area"/></button>}</div>
 <details><summary><UiText text="GPS not accurate? Choose a pickup area"/></summary><label><UiText text="Pickup area"/><select value={zone} onChange={e=>setZone(e.target.value)} disabled={busy}><option value=""><UiText text="Choose a nearby kitchen area"/></option>{zones.map(z=><option key={z.id} value={z.id}>{z.locality}, {z.city} · {z.name}</option>)}</select></label><button type="button" className="button" disabled={busy||!zone||!Number.isInteger(capacity)||capacity<1||capacity>30} onClick={()=>void save("zone")}><UiText text="Use this pickup area"/></button></details></>}{message&&<p role="status"><UiText text={message}/></p>}</section>;
}
