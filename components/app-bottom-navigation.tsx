"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState,useSyncExternalStore} from "react";
import {appNavigation,activeNavigationIndex,type AppRole} from "@/lib/app-navigation";
import {AppIcon} from "@/components/app-icon";
import {UiText} from "@/components/ui-language";
const subscribe=(fn:()=>void)=>{window.addEventListener("hashchange",fn);window.addEventListener("popstate",fn);return()=>{window.removeEventListener("hashchange",fn);window.removeEventListener("popstate",fn);};};
export function AppBottomNavigation({role}:{role:AppRole}){
 const path=usePathname(),hash=useSyncExternalStore(subscribe,()=>window.location.hash,()=>"");
 const [selected,setSelected]=useState<{path:string;hash:string}|null>(null);
 useEffect(()=>{const clear=()=>setSelected(null);window.addEventListener("popstate",clear);window.addEventListener("hashchange",clear);return()=>{window.removeEventListener("popstate",clear);window.removeEventListener("hashchange",clear);};},[]);
 const items=appNavigation[role],active=activeNavigationIndex(role,path,selected?.path===path?selected.hash:hash);
 return <nav className="app-bottom-nav app-navigation-refresh" aria-label={role.toLowerCase().replaceAll("_"," ")+" app navigation"} style={{gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`}}>{items.map((item,index)=><Link key={item.href} href={item.href} aria-current={index===active?"page":undefined} onClick={()=>{const [target,fragment=""]=item.href.split("#");setSelected({path:target,hash:fragment?"#"+fragment:""});}}><span className="app-nav-icon"><AppIcon name={item.icon}/></span><span className="app-nav-label"><UiText text={item.label}/></span></Link>)}</nav>;
}
