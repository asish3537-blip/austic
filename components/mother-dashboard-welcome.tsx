"use client";

import Link from "next/link";
import {useState, useSyncExternalStore} from "react";
import {AppIcon} from "@/components/app-icon";
import {UiText, useUiLanguage} from "@/components/ui-language";

const stories = [
  {title:"Your cooking. Your own little business.",body:"Share the food you love making with customers nearby.",image:"/assets/home-thali.avif"},
  {title:"Something special, whenever you can.",body:"List a one-day special on the days you choose to cook.",image:"/assets/home-regional.avif"},
  {title:"Made at home. Shared nearby.",body:"Turn your sattu, sweets and pickles into a homemade food shop.",image:"/assets/home-thali.avif"},
];

function subscribeReminder(callback:()=>void){window.addEventListener("paustik-kitchen-reminder",callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener("paustik-kitchen-reminder",callback);window.removeEventListener("storage",callback);};}

export function MotherLicenceReminder({kitchenId,hasFssai,fssaiReview}:{kitchenId:string;hasFssai:boolean;fssaiReview:string|null}){
  const {t}=useUiLanguage();
  const [dismissedKey,setDismissedKey]=useState("");
  const pending=fssaiReview==="PENDING";
  const storageKey="paustik-licence-reminder:"+kitchenId+":"+(fssaiReview??"missing");
  const dismissed=useSyncExternalStore(subscribeReminder,()=>{try{return localStorage.getItem(storageKey)==="dismissed";}catch{return false;}},()=>false);
  if(dismissed||dismissedKey===storageKey||(!pending&&(hasFssai||fssaiReview==="APPROVED")))return null;
  return <aside className="mother-licence-reminder" aria-label={t("FSSAI food registration & licence")}>
    <span className="mother-reminder-icon"><AppIcon name="orders"/></span>
    <div><strong><UiText text={pending?"FSSAI document under review":"Start with your FSSAI registration"}/></strong><p><UiText text={pending?"Your certificate is uploaded. Check its review status or contact support.":"Need a food licence? Follow the Mother Kitchen guide, apply on FoSCoS and upload your certificate."}/></p><div className="mother-reminder-links">{!pending&&<a href="https://foscos.fssai.gov.in/" target="_blank" rel="noopener noreferrer"><UiText text="Apply on FoSCoS"/> ↗</a>}<Link href={pending?"/mother/quality?type=FSSAI":"/mother-guide"}><UiText text={pending?"Check FSSAI & inspection status":"Start your Mother Kitchen"}/> →</Link>{!pending&&<Link href="/mother/quality?type=FSSAI"><UiText text="Upload your certificate"/> →</Link>}</div></div>
    <button type="button" aria-label={t("Dismiss reminder")} onClick={()=>{setDismissedKey(storageKey);try{localStorage.setItem(storageKey,"dismissed");}catch{}window.dispatchEvent(new Event("paustik-kitchen-reminder"));}}>×</button>
  </aside>;
}

export function MotherDashboardWelcome({kitchenName,onAddMeal}:{kitchenName:string;onAddMeal:(special:boolean)=>void}){
  const [slide,setSlide]=useState(0);
  const {t}=useUiLanguage();
  const story=stories[slide];
  return <section className="mother-welcome" aria-label={t("Your Mother Kitchen")}> 
    <div className="mother-welcome-story" style={{backgroundImage:`linear-gradient(90deg,rgba(83,24,35,.96),rgba(83,24,35,.82) 52%,rgba(83,24,35,.25)),url(${story.image})`}}>
      <div className="mother-welcome-copy" aria-live="polite"><span className="eyebrow"><UiText text="Your Mother Kitchen"/> · {kitchenName}</span><h1><UiText text={story.title}/></h1><p><UiText text={story.body}/></p></div>
      <div className="mother-story-controls"><button type="button" aria-label={t("Previous kitchen story")} onClick={()=>setSlide(v=>(v+stories.length-1)%stories.length)}>←</button><span>{slide+1} / {stories.length}</span><button type="button" aria-label={t("Next kitchen story")} onClick={()=>setSlide(v=>(v+1)%stories.length)}>→</button></div>
    </div>
    <nav className="mother-create-actions" aria-label={t("Add food to your kitchen")}>
      <button type="button" onClick={()=>onAddMeal(false)}><span className="mother-create-icon"><AppIcon name="meal"/></span><span><strong><UiText text="Add a meal"/></strong><small><UiText text="Everyday cooking"/></small></span><span aria-hidden="true">+</span></button>
      <button type="button" onClick={()=>onAddMeal(true)}><span className="mother-create-icon"><AppIcon name="menu"/></span><span><strong><UiText text="One-day special"/></strong><small><UiText text="Cook when it suits you"/></small></span><span aria-hidden="true">+</span></button>
      <Link href="/mother/marketplace?add=product#product-editor"><span className="mother-create-icon"><AppIcon name="shop"/></span><span><strong><UiText text="Homemade products"/></strong><small><UiText text="Sattu, sweets & pickles"/></small></span><span aria-hidden="true">+</span></Link>
    </nav>
    <nav className="mother-welcome-tools" aria-label={t("Kitchen tools")}><a href="#scheduled-menu"><UiText text="Scheduled meals"/> →</a><a href="#incoming-orders"><UiText text="Incoming orders"/> →</a><Link href="/help"><UiText text="Help & support"/> →</Link></nav>
  </section>;
}
