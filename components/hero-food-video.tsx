"use client";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {UiText,useUiLanguage} from "@/components/ui-language";
import {HERO_VIDEOS,SCHOOL_HERO_VIDEOS,nextHeroVideo} from "@/lib/hero-videos";

export function HeroFoodVideo({service="food",clips:customClips,showControl=true,stopAfter}:{service?:"food"|"school";clips?:readonly string[];showControl?:boolean;stopAfter?:number}){
 const clips=customClips??(service==="school"?SCHOOL_HERO_VIDEOS:HERO_VIDEOS);
 const poster=service==="school"?"/assets/scoofoo-storyboard.webp":"/assets/home-fresh.avif";
 const {t}=useUiLanguage();
 const video=useRef<HTMLVideoElement>(null),failedClips=useRef(new Set<number>());
 const [frameReady,setFrameReady]=useState(false);
 const [motion,setMotion]=useState(false),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 const [index,setIndex]=useState(0),[userPaused,setUserPaused]=useState(false);
 useEffect(()=>{
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  const update=()=>setMotion(!preference.matches&&!connection?.saveData);
  update();preference.addEventListener("change",update);
  return()=>preference.removeEventListener("change",update);
 },[]);
 useEffect(()=>{
  const visible=()=>{const element=video.current;if(!element)return;if(document.hidden)element.pause();else if(motion&&!userPaused)void element.play().catch(()=>setPlaying(false));};
  document.addEventListener("visibilitychange",visible);
  return()=>document.removeEventListener("visibilitychange",visible);
 },[motion,userPaused,index]);
 function advance(broken=false){
  if(broken)failedClips.current.add(index);
  const next=nextHeroVideo(index,failedClips.current,clips.length);
  setPlaying(false);
  if(next===null)setFailed(true);
  else if(next===index){const element=video.current;if(element){element.currentTime=0;void element.play().catch(()=>setPlaying(false));}}
  else setIndex(next);
 }
 function toggle(){const element=video.current;if(!element)return;if(element.paused){setUserPaused(false);void element.play().catch(()=>setPlaying(false));}else{setUserPaused(true);element.pause();}}
 return <>
  <div className="hero-food-backdrop" aria-hidden="true">
   <Image src={poster} alt="" fill priority sizes="100vw"/>
   {motion&&!failed&&<video key={clips[index]} ref={video} src={clips[index]} className={playing||(Boolean(stopAfter)&&frameReady)?"is-playing":""} autoPlay={!userPaused} muted playsInline preload="metadata" poster={poster} onLoadedData={()=>setFrameReady(true)} onTimeUpdate={e=>{if(stopAfter&&e.currentTarget.currentTime>=stopAfter)e.currentTarget.pause();}} onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>advance()} onError={()=>advance(true)}/>}
  </div>
  {showControl&&motion&&!failed&&<button className="hero-video-toggle" type="button" onClick={toggle} aria-pressed={playing} title={t(playing?"Pause background":"Play background")}><span aria-hidden="true">{playing?"Ⅱ":"▶"}</span><span className="visually-hidden"><UiText text={playing?"Pause background":"Play background"}/></span></button>}
 </>;
}
