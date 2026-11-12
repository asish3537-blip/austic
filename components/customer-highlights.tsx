"use client";
import { HeroFilm } from "@/components/hero-film";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useState} from "react";
import type {CustomerKitchen} from "@/lib/customer-kitchen-types";
import {useUiLanguage} from "@/components/ui-language";
export function CustomerHighlights({kitchens}:{kitchens:CustomerKitchen[]}){
 const {t}=useUiLanguage();
 const latest=kitchens.flatMap(k=>k.meals.map(m=>({k,m}))).sort((a,b)=>a.m.serviceDate.localeCompare(b.m.serviceDate))[0];
 const spotlight=[...kitchens].sort((a,b)=>b.rating-a.rating)[0];
 const slides=[{tag:t("Made for your everyday"),title:t("A little planning. A lot of home."),copy:t("Choose your Mother Kitchen and plan 3–7 meal days."),cta:t("Explore subscriptions"),href:"/customer/dashboard?mode=subscription#customer-discover",image:"/assets/home-thali.avif",tone:"green"},...(latest?[{tag:t("On the menu"),title:latest.m.name,copy:latest.k.name+" · ₹"+latest.m.price+" per meal · "+latest.m.serviceDate,cta:t("View menu"),href:"/customer/kitchens/"+latest.k.id+"#kitchen-menu",image:"/assets/meal-"+(({EGG:"egg",CHEESE:"cheese",CHICKEN:"chicken"} as Record<string,string>)[latest.m.tier]??"base")+".svg",tone:"cream"}]:[]),...(spotlight?[{tag:t("Kitchen spotlight"),title:spotlight.name,copy:spotlight.motherName+" · "+spotlight.locality+(spotlight.rating>0?" · ★ "+spotlight.rating.toFixed(1):""),cta:t("Meet your Mother Kitchen"),href:"/customer/kitchens/"+spotlight.id,image:"/assets/mother-child-meal.svg",tone:"green"}]:[]),{tag:t("Your Paustik wallet"),title:t("Ready for your next meal."),copy:t("Check your balance and available pilot credit."),cta:t("Open wallet"),href:"/customer/wallet",image:"/assets/meal-egg.svg",tone:"cream"},{tag:t("More from Mother Kitchens"),title:t("Small batches. Homemade favourites."),copy:t("Browse sattu, sweets and pickles. Agree your delivery time."),cta:t("Explore products"),href:"/customer/marketplace",image:"/assets/meal-cheese.svg",tone:"green"}];
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false);
 const current=index%slides.length,slide=slides[current];
 useEffect(()=>{if(paused||hovered||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const timer=setInterval(()=>setIndex(i=>(i+1)%slides.length),7000);return()=>clearInterval(timer);},[paused,hovered,slides.length]);
 return <section className={"customer-highlights tone-"+slide.tone} aria-label="Paustik highlights" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setPaused(true)}>
  <HeroFilm/><div className="highlight-content" role="group" aria-roledescription="slide" aria-label={(current+1)+" of "+slides.length}><span className="eyebrow">{slide.tag}</span><h2>{slide.title}</h2><p>{slide.copy}</p><Link className="button button-small" href={slide.href}>{slide.cta} →</Link></div>
  <Image src={slide.image} alt="" width={290} height={235} className="highlight-art"/>
  <div className="highlight-controls"><div role="group" aria-label="Choose highlight">{slides.map((s,i)=><button key={s.href+s.tag} type="button" aria-label={"Highlight "+(i+1)+": "+s.tag} aria-pressed={current===i} onClick={()=>{setIndex(i);setPaused(true);}}><span/></button>)}</div><button type="button" onClick={()=>setPaused(!paused)} aria-label={paused?"Play highlights":"Pause highlights"}>{paused?"▶":"Ⅱ"}</button><button type="button" aria-label="Previous highlight" onClick={()=>{setIndex((current+slides.length-1)%slides.length);setPaused(true);}}>←</button><button type="button" aria-label="Next highlight" onClick={()=>{setIndex((current+1)%slides.length);setPaused(true);}}>→</button></div>
 </section>;
}
