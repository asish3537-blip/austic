"use client";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {UiText,useUiLanguage} from "@/components/ui-language";

export function HeroFoodVideo(){
 const {t}=useUiLanguage();
 const video=useRef<HTMLVideoElement>(null);
 const [motion,setMotion]=useState(false),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  const update=()=>setMotion(!preference.matches&&!connection?.saveData);
  update();preference.addEventListener("change",update);
  return()=>preference.removeEventListener("change",update);
 },[]);
 function toggle(){const element=video.current;if(!element)return;if(element.paused){void element.play().catch(()=>setPlaying(false));}else element.pause();}
 return <>
  <div className="hero-food-backdrop" aria-hidden="true">
   <Image src="/assets/home-fresh.avif" alt="" fill priority sizes="100vw"/>
   {motion&&!failed&&<video ref={video} className={playing?"is-playing":""} autoPlay loop muted playsInline preload="metadata" poster="/assets/home-fresh.avif" onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}><source src="/media/paustik-food-hero.mp4" type="video/mp4"/></video>}
  </div>
  {motion&&!failed&&<button className="hero-video-toggle" type="button" onClick={toggle} aria-pressed={playing} title={t(playing?"Pause background":"Play background")}><span aria-hidden="true">{playing?"Ⅱ":"▶"}</span><span className="visually-hidden"><UiText text={playing?"Pause background":"Play background"}/></span></button>}
 </>;
}
