"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {AppIcon} from "@/components/app-icon";
import {useUiLanguage} from "@/components/ui-language";
export function AppNotificationLink(){
 const {t}=useUiLanguage();const [unread,setUnread]=useState(0);
 useEffect(()=>{const c=new AbortController();let active=true;
  const load=async()=>{if(document.visibilityState!=="visible")return;try{const r=await fetch("/api/notifications",{cache:"no-store",signal:c.signal});if(r.ok){const data=await r.json();if(active)setUnread(Math.max(0,Math.floor(Number(data.unread)||0)));}}catch{}};
  void load();const timer=setInterval(()=>void load(),30000);window.addEventListener("focus",load);window.addEventListener("paustik-notifications-changed",load);
  return()=>{active=false;c.abort();clearInterval(timer);window.removeEventListener("focus",load);window.removeEventListener("paustik-notifications-changed",load);};
 },[]);
 return <Link className="app-notification-link" href="/notifications" aria-label={t("Notifications")+(unread?` · ${unread}`:"")}><AppIcon name="bell"/>{unread>0&&<span className="app-notification-badge">{unread>99?"99+":unread}</span>}</Link>;
}
