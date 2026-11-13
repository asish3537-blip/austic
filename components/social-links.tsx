"use client";
import {useEffect,useState} from "react";
import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";
export function SocialLinks(){
 const [links,setLinks]=useState<Record<string,string>>({});
 useEffect(()=>{const c=new AbortController();fetch("/api/site-links",{signal:c.signal}).then(r=>r.ok?r.json():{}).then(setLinks).catch(()=>{});return()=>c.abort();},[]);
 const icons={youtube:<><rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></>,facebook:<path d="M14 21v-8h3l1-4h-4V7c0-1 1-2 2-2h2V2h-3c-4 0-5 2-5 5v2H7v4h3v8"/>,instagram:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>};
 return <div className="paustik-social-links"><a className="social-whatsapp" href={WHATSAPP_SUPPORT_URL} aria-label="Chat with Paustik on WhatsApp" title="WhatsApp support" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-13.6 7.8L3 21l1.6-4.5A9 9 0 1 1 21 11.5Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 4l1-1 3 2c-1 3-4 2-7-1s-5-6-2-8Z"/></svg></a>{([['youtube','YouTube'],['facebook','Facebook'],['instagram','Instagram']] as const).map(([key,name])=>{const url=links[key];return url&&new RegExp('^https://(www\.)?'+key+'\.com/').test(url)?<a key={key} href={url} aria-label={"Paustik on "+name} title={name} target="_blank" rel="noopener noreferrer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[key]}</svg></a>:null;})}</div>;
}
