"use client";
import {useRef,useState} from "react";
import {AppIcon} from "@/components/app-icon";
import {BrandWordmark} from "@/components/brand-wordmark";
import {UiText,useUiLanguage} from "@/components/ui-language";
import Image from "next/image";
import Link from "next/link";
const features=[
 {icon:"menu",title:"Meal subscriptions",href:"/customer/dashboard?mode=subscription",image:"/assets/home-meal-plans-v2.webp",body:"Choose your Mother Kitchen and plan 3–7 meal days."},
 {icon:"meal",title:"One-time meals",href:"/customer/dashboard?mode=once",image:"/assets/home-one-day-v2.webp",body:"Choose a freshly prepared meal for one day. No subscription needed."},
 {icon:"people",title:"Mother Kitchens",href:"/app",image:"/assets/home-find-meal-v2.webp",body:"Find meals nearby"},
 {icon:"shop",title:"Homemade products",href:"/customer/marketplace",image:"/assets/home-homemade-v2.webp",body:"Discover sattu, sweets and pickles from nearby Mother Kitchens."},
 {icon:"pay",title:"Offers & wallet",href:"/customer/wallet",body:"Review your wallet and payment options in your account."},
 {icon:"route",title:"Order tracking",href:"/customer/orders",body:"Follow preparation, packing, courier pickup and delivery."},
] as const;
export function AppFeatureShowcase(){
 const [selected,setSelected]=useState<number|null>(null);
 const menuScreen=useRef<HTMLDivElement>(null),detailScreen=useRef<HTMLDivElement>(null);
 const {t}=useUiLanguage();
 const feature=selected===null?null:features[selected];
 const image=feature&&"image" in feature?feature.image:feature?null:"/assets/home-find-meal-v2.webp";
 function show(index:number|null){setSelected(index);if(window.matchMedia("(max-width:720px)").matches)requestAnimationFrame(()=>{(index===null?menuScreen:detailScreen).current?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});}
 return <section className="app-feature-showcase eh-container duo-showcase" aria-labelledby="duo-showcase-title">
  <span className="eh-eyebrow"><UiText text="Made for the way you eat"/></span><h2 id="duo-showcase-title"><UiText text="What’s waiting for you"/><br/><UiText text="on the Paustik app?"/></h2><p><UiText text="Everyday meals, occasional cravings and homemade favourites, all close to home."/></p>
  <div className="duo-device"><div className="duo-device-status" aria-hidden="true"><span>9:41</span><i/><span>● ● ● ▰</span></div><div className="duo-screens">
   <div className="duo-menu-screen" ref={menuScreen}><BrandWordmark width={150} height={72}/><h3><UiText text="A little home."/><br/><UiText text="Any day you choose."/></h3><p className="duo-menu-hint"><UiText text="Tap a feature to explore"/></p>
    <div className="duo-app-grid" role="group" aria-label={t("Choose a feature")}>{features.map((item,index)=><button type="button" key={item.title} aria-pressed={selected===index} aria-controls="duo-preview-content" onClick={()=>show(index)}><span className="duo-app-icon" aria-hidden="true"><AppIcon name={item.icon}/></span><strong><UiText text={item.title}/></strong></button>)}</div><small><UiText text="Illustrative app preview"/></small>
   </div><div className="duo-fold" aria-hidden="true"/>
   <div className="duo-detail-screen" id="duo-preview-content" ref={detailScreen}><header><button type="button" className="duo-home-control" onClick={()=>show(null)} aria-label={t("Preview home")}><span aria-hidden="true">⌂</span><UiText text="Home"/></button><span><UiText text="Discover Paustik"/></span><span className="duo-screen-dot" aria-hidden="true"/></header>
    <div className="duo-preview-transition" key={selected??"home"} aria-live="polite" aria-atomic="true">
     {image&&<div className="duo-preview-photo"><Image src={image} alt={feature?t(feature.title)+" · "+t("Meal inspiration pictured. Actual dishes and availability vary by kitchen."):t("Home-style meal inspiration")} fill sizes="(max-width:720px) 90vw, 500px"/></div>}
     {selected===4&&<div className="duo-payment-preview" aria-hidden="true"><AppIcon name="pay"/><span>Paustik Pay</span><div><i/><i/><i/></div></div>}
     {selected===5&&<ol className="duo-tracking-preview">{["Preparing your meal","Packed · ready for courier","Picked up by courier","Delivered"].map(label=><li key={label}><span aria-hidden="true"/><UiText text={label}/></li>)}</ol>}
     <h3><UiText text={feature?.title??"Find your next meal"}/></h3><p><UiText text={feature?.body??"Choose your kitchen."}/></p><Link className="button" href={feature?.href??"/app"}><UiText text={feature?"Open in Paustik":"Find your next meal"}/></Link><small><UiText text="Preview only. Continue in the app to see current availability."/></small>
    </div><div className="duo-home-indicator" aria-hidden="true"/>
   </div>
  </div></div>
 </section>;
}
