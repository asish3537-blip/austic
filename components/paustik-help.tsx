"use client";
import Image from "next/image";
import {UiText,useUiLanguage} from "@/components/ui-language";
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from "react";
import {recognitionConstructor,startVoiceCapture} from "@/lib/browser-voice";
import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";
type HelpLink={label:string;href:string};
type Message={role:"user"|"assistant";content:string};
const starter:Message={role:"assistant",content:"Hi! Ask me how to find meals, reserve days, track orders or use your Paustik workspace. Type, or use voice input on a supported browser."};
const suggestions=["How do weekly meal plans work?","Where are my product purchases?","How do I track an order?"];
const subscribe=()=>()=>{};
const voiceSupported=()=>Boolean(recognitionConstructor(window))&&window.isSecureContext;
export function PaustikHelp(){
 const {language,t}=useUiLanguage();
 const [aiReady,setAiReady]=useState(false);
 const latest=useRef<HTMLDivElement>(null),capture=useRef<(()=>void)|null>(null),request=useRef<AbortController|null>(null);
 const [links,setLinks]=useState<HelpLink[]>([]),[open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([starter]),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [listening,setListening]=useState(false),[speaking,setSpeaking]=useState(false),[voiceNote,setVoiceNote]=useState("");
 const canTalk=useSyncExternalStore(subscribe,voiceSupported,()=>false);
 function stopVoice(){capture.current?.();capture.current=null;window.speechSynthesis?.cancel();setSpeaking(false);setVoiceNote("");}
 function close(){stopVoice();request.current?.abort();request.current=null;setBusy(false);setOpen(false);}
 useEffect(()=>{latest.current?.scrollIntoView({block:"nearest"});},[messages,busy]);
 useEffect(()=>{
  if(!open)return;const controller=new AbortController();
  fetch("/api/assistant",{cache:"no-store",signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(d){setLinks(d.links||[]);setAiReady(d.mode==="ai");}}).catch(()=>{});
  const hidden=()=>{if(document.visibilityState!=="visible"){capture.current?.();capture.current=null;window.speechSynthesis?.cancel();setSpeaking(false);}};
  document.addEventListener("visibilitychange",hidden);
  return()=>{controller.abort();capture.current?.();capture.current=null;request.current?.abort();window.speechSynthesis?.cancel();document.removeEventListener("visibilitychange",hidden);};
 },[open]);
 useEffect(()=>{const clear=()=>{capture.current?.();capture.current=null;request.current?.abort();window.speechSynthesis?.cancel();setMessages([starter]);setLinks([]);setDraft("");setOpen(false);setSpeaking(false);setBusy(false);};window.addEventListener("paustik-auth-changed",clear);return()=>window.removeEventListener("paustik-auth-changed",clear);},[]);
 function talk(){
  if(listening){capture.current?.();capture.current=null;return;}
  const ctor=recognitionConstructor(window);if(!ctor||!window.isSecureContext){setVoiceNote("Voice input is not available in this browser. Type below, or try a supported browser such as Chrome.");return;}
  window.speechSynthesis?.cancel();setSpeaking(false);setVoiceNote(t("Listening… tap Stop listening to finish."));setListening(true);
  capture.current=startVoiceCapture(ctor,{text:value=>{setDraft(value);setVoiceNote("I heard you. Review the words below, then press Send.");},error:setVoiceNote,ended:()=>{setListening(false);setVoiceNote(current=>current===t("Listening… tap Stop listening to finish.")?"Microphone off. Type your question or tap Talk to try again.":current);}},20000,language==="or"?"or-IN":language==="hi"?"hi-IN":"en-IN");
 }
 function readAloud(){
  if(!("speechSynthesis" in window)){setVoiceNote("Read aloud is unavailable on this device. Text help still works.");return;}
  if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}capture.current?.();capture.current=null;
  const text=t(messages.filter(m=>m.role==="assistant").at(-1)?.content||"");if(!text)return;
  const voices=window.speechSynthesis.getVoices(),voice=voices.find(v=>v.localService&&v.lang.startsWith(language))??voices.find(v=>v.lang.startsWith(language));
  if(language!=="en"&&!voice){setVoiceNote(t("This device has no voice for the selected language. You can read the reply or change language."));return;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice?.lang??(language==="hi"?"hi-IN":language==="or"?"or-IN":"en-IN");if(voice)utterance.voice=voice;
  utterance.onend=()=>{setSpeaking(false);setVoiceNote("Finished reading.");};utterance.onerror=e=>{setSpeaking(false);if(!["canceled","interrupted"].includes(e.error))setVoiceNote("The browser could not read this answer. You can read the text above.");};
  window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setVoiceNote("Reading the latest reply. Tap Stop reading to pause.");
 }
 async function send(event?:FormEvent<HTMLFormElement>,suggested?:string){
  event?.preventDefault();const content=(suggested??draft).trim();if(!content||busy)return;
  stopVoice();const next:Message[]=[...messages,{role:"user",content}];setMessages(next);setDraft("");setBusy(true);setError("");const controller=new AbortController();request.current=controller;
  try{const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-12),guidedOnly:!aiReady,language}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||"Paustik help could not answer just now.");if(controller.signal.aborted)return;setLinks(data.links||[]);if(data.notice)setVoiceNote(data.notice);setMessages(current=>[...current,{role:"assistant",content:String(data.reply||"")}]);}
  catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Help is unavailable. Please try again.");}
  finally{if(request.current===controller){request.current=null;setBusy(false);}}
 }
 function clearChat(){stopVoice();setMessages([starter]);setDraft("");setError("");setVoiceNote("");}
 return <div className="pausstik-assistant">
  {open&&<section id="paustik-help-panel" className="pausstik-chat-panel" role="dialog" aria-label={t("Paustik help")}>
   <header><span className="assistant-mark" aria-hidden="true"><Image src="/assets/paustik-helper.svg" width={38} height={38} alt=""/></span><div><strong><UiText text="Paustik help"/></strong><small><UiText text={aiReady?"Live AI · voice & text":"Guided help · voice & text"}/></small></div><button type="button" aria-label="Close Paustik help" onClick={close}>×</button></header>
   <div className="pausstik-chat-messages" aria-live="polite">{messages.map((m,i)=><p key={i+"-"+m.role} className={"pausstik-chat-message "+m.role}><UiText text={m.content}/></p>)}<div ref={latest}/>{busy&&<p className="pausstik-chat-message assistant assistant-pending"><UiText text="Finding guidance…"/></p>}{error&&<p className="pausstik-chat-error" role="alert">{error}</p>}</div>
   {messages.length===1&&<div className="pausstik-chat-suggestions">{suggestions.map(s=><button type="button" key={s} onClick={()=>void send(undefined,s)} disabled={busy}><UiText text={s}/></button>)}</div>}
   <details className="paustik-help-link-menu"><summary><UiText text="Your workspace links"/></summary><nav className="paustik-help-actions">{links.map(link=><a key={link.href} href={link.href}><UiText text={link.label}/></a>)}</nav></details>
   <div className="paustik-help-tools"><button type="button" className={listening?"is-listening":""} onClick={talk} disabled={busy} aria-pressed={listening}><UiText text={listening?"■ Stop listening":"🎙 Talk to Paustik"}/></button><button type="button" onClick={readAloud} aria-pressed={speaking}><UiText text={speaking?"Stop reading":"Read reply aloud"}/></button><button type="button" disabled={busy} onClick={clearChat}><UiText text="Clear"/></button></div>
   {!canTalk&&<small className="paustik-voice-note">Voice input depends on your browser. Typing and read-aloud remain available where supported.</small>}{voiceNote&&<small className="paustik-voice-note" role="status"><UiText text={voiceNote}/></small>}
   <form onSubmit={event=>void send(event)}><label className="visually-hidden" htmlFor="pausstik-question">Ask Paustik</label><input id="pausstik-question" value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t("Ask a Paustik question…")} maxLength={1200} disabled={busy}/><button type="submit" aria-label="Send message" disabled={busy||!draft.trim()}>↑</button></form>
   <a className="paustik-whatsapp-support" href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UiText text="Chat with Paustik on WhatsApp ↗"/></a>
   <small className="pausstik-chat-footnote">App guidance only, not general-purpose AI. Voice starts only when you tap Talk; your browser may process speech online. Review the words before sending. Never share passwords or codes. WhatsApp opens a chat; no message is sent automatically.</small>
  </section>}
  <button className="pausstik-assistant-launcher" type="button" aria-label={t(open?"Close help":"Paustik help")} aria-controls="paustik-help-panel" aria-expanded={open} onClick={()=>open?close():setOpen(true)}><Image src="/assets/paustik-helper.svg" width={44} height={44} alt=""/><span className="visually-hidden">{open?t("Close help"):t("Paustik help")}</span></button>
 </div>;
}
