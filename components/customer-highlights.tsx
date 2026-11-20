"use client";
import {HeroFoodVideo} from "@/components/hero-food-video";
import {AppIcon} from "@/components/app-icon";
import Link from "next/link";
import {useRef,useState} from "react";
import {useUiLanguage} from "@/components/ui-language";
const slides=[
 {title:"A little planning. A lot of home.",body:"Choose your Mother Kitchen and plan 3–7 meal days.",label:"Meal subscriptions",href:"/customer/dashboard?mode=subscription#customer-discover",video:"/media/hero-preparation.mp4",icon:"menu"},
 {title:"One good meal. Just when you need it.",body:"Choose a freshly prepared meal for one day. No subscription needed.",label:"One-time meals",href:"/customer/dashboard?mode=once#customer-discover",video:"/media/hero-rice.mp4",icon:"meal"},
 {title:"Homemade favourites, close to you.",body:"Discover sattu, sweets and pickles from nearby Mother Kitchens.",label:"Homemade products",href:"/customer/marketplace",video:"/media/hero-vegetables.mp4",icon:"shop"},
 {title:"Your cooking. Their school lunch.",body:"Pack at home. Follow pickup and school reception handover.",label:"Explore ScooFoo",href:"/school-tiffins",video:"/media/scoofoo-scene-2.mp4",icon:"school"},
] as const;
export function CustomerHighlights({mode="all"}:{mode?:string}){
 const swipe=useRef<{x:number;y:number}|null>(null);
 const {t}=useUiLanguage();const [index,setIndex]=useState(mode==="once"?1:0);const slide=slides[index];
 return <section className="customer-highlights customer-home-hero customer-feature-carousel" aria-label={t("Discover Paustik")} aria-roledescription={t("Carousel")} onTouchStart={e=>{const p=e.touches[0];swipe.current={x:p.clientX,y:p.clientY};}} onTouchEnd={e=>{const start=swipe.current,p=e.changedTouches[0];swipe.current=null;if(!start)return;const dx=p.clientX-start.x,dy=p.clientY-start.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))setIndex(i=>(i+(dx<0?1:3))%4);}}>
  <HeroFoodVideo key={index} service={index===3?"school":"food"} clips={[slide.video]} showControl={false} stopAfter={4.5}/>
  <div className="highlight-content"><span className="eyebrow">{t("Made for your everyday")}</span><div className="feature-slide-copy" aria-live="polite"><h2>{t(slide.title)}</h2><p>{t(slide.body)}</p></div>
   {index===3?<Link className="feature-school-action" href={slide.href}><AppIcon name="school"/>{t(slide.label)} <span aria-hidden="true">↗</span></Link>:<nav className="customer-hero-actions" aria-label={t("Choose how to order")}>{slides.slice(0,3).map(s=><Link key={s.href} href={s.href}><AppIcon name={s.icon}/><span>{t(s.label)}</span></Link>)}</nav>}
   <div className="feature-carousel-controls"><button type="button" aria-label={t("Previous slide")} onClick={()=>setIndex(i=>(i+3)%4)}>‹</button><div role="group" aria-label={t("Choose a feature")}>{slides.map((s,i)=><button type="button" key={s.label} aria-label={t(s.label)} aria-pressed={index===i} onClick={()=>setIndex(i)}><span/></button>)}</div><button type="button" aria-label={t("Next slide")} onClick={()=>setIndex(i=>(i+1)%4)}>›</button></div>
  </div>
 </section>;
}
