"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type HelpLink = { label: string; href: string };
type Message = { role: "user" | "assistant"; content: string };
const starter: Message = { role: "assistant", content: "Hi! I can help you find your way around Paustik, explain meal plans, cancellation and delivery steps, or guide you through your workspace." };
const suggestions = ["How do weekly meal plans work?", "How do I update my menu?", "How does delivery tracking work?"];

export function PausstikAssistant() {
  const latest = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<HelpLink[]>([]);
  const [mode, setMode] = useState("guided");
  const [voiceNote, setVoiceNote] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { latest.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/assistant", { cache: "no-store", signal: controller.signal }).then(r => r.json()).then(data => { setLinks(data.links || []); setMode(data.mode || "guided"); }).catch(() => {});
    return () => { controller.abort(); window.speechSynthesis?.cancel(); };
  }, [open]);
  useEffect(() => {
    const clear = () => { window.speechSynthesis?.cancel(); setMessages([starter]); setLinks([]); setDraft(""); setOpen(false); setSpeaking(false); };
    window.addEventListener("paustik-auth-changed", clear);
    return () => window.removeEventListener("paustik-auth-changed", clear);
  }, []);
  function readAloud() {
    if (!("speechSynthesis" in window)) { setVoiceNote("Read aloud is not supported on this device."); return; }
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const voice = window.speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith("en"));
    if (!voice) { setVoiceNote("No English device voice is available. Text help is ready; live voice input will be connected later."); return; }
    const text = messages.filter(m => m.role === "assistant").at(-1)?.content;
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setSpeaking(true); setVoiceNote("Reading with your device voice.");
  }
  async function send(event?: FormEvent<HTMLFormElement>, suggested?: string) {
    event?.preventDefault();
    const content = (suggested ?? draft).trim();
    if (!content || busy) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Paustik help could not answer just now.");
      setLinks(data.links || []); setMode(data.mode || "guided");
      setMessages((current) => [...current, { role: "assistant", content: String(data.reply || "") }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paustik help could not answer just now.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="pausstik-assistant">
    {open && <section className="pausstik-chat-panel" aria-label="Paustik help">
      <header><span className="assistant-mark" aria-hidden="true">✦</span><div><strong>Paustik help</strong><small>{mode === "ai" ? "AI help" : "Guided help · live AI later"}</small></div><button type="button" aria-label="Close Paustik help" onClick={() => setOpen(false)}>×</button></header>
      <div className="pausstik-chat-messages" aria-live="polite">
        {messages.map((message, index) => <p key={`${index}-${message.role}`} className={`pausstik-chat-message ${message.role}`}>{message.content}</p>)}
        <div ref={latest} />
        {busy && <p className="pausstik-chat-message assistant assistant-pending">Finding guidance…</p>}
        {error && <p className="pausstik-chat-error" role="alert">{error}</p>}
      </div>
      {messages.length === 1 && <div className="pausstik-chat-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(undefined, suggestion)} disabled={busy}>{suggestion}</button>)}</div>}
      <div className="paustik-help-actions">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</div>
      <div className="paustik-help-tools"><button type="button" onClick={readAloud}>{speaking ? "Stop reading" : "Read aloud"}</button><button type="button" disabled={busy} onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false); setMessages([starter]); setError(""); }}>Clear chat</button></div>
      {voiceNote && <small role="status">{voiceNote}</small>}
      <form onSubmit={(event) => void send(event)}>
        <label className="visually-hidden" htmlFor="pausstik-question">Ask Paustik</label>
        <input id="pausstik-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a Paustik question…" maxLength={1200} disabled={busy} />
        <button type="submit" aria-label="Send message" disabled={busy || !draft.trim()}>↑</button>
      </form>
      <small className="pausstik-chat-footnote">Guidance only. Confirm details in your workspace. Live AI and voice input will be connected later. Never share passwords or codes.</small>
    </section>}
    <button className="pausstik-assistant-launcher" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span aria-hidden="true">✦</span>{open ? "Close help" : "Paustik help"}</button>
  </div>;
}
