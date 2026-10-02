"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };
const starter: Message = { role: "assistant", content: "Hi! I can help you find your way around Pausstik, explain meal plans, cancellation and delivery steps, or guide you through your workspace." };
const suggestions = ["How do weekly meal plans work?", "How do I update my menu?", "How does delivery tracking work?"];

export function PausstikAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      if (!response.ok) throw new Error(data.error || "Pausstik help could not answer just now.");
      setMessages((current) => [...current, { role: "assistant", content: String(data.reply || "") }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pausstik help could not answer just now.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="pausstik-assistant">
    {open && <section className="pausstik-chat-panel" aria-label="Pausstik AI help">
      <header><span className="assistant-mark" aria-hidden="true">✦</span><div><strong>Pausstik help</strong><small>AI assistant · account actions remain yours</small></div><button type="button" aria-label="Close Pausstik help" onClick={() => setOpen(false)}>×</button></header>
      <div className="pausstik-chat-messages" aria-live="polite">
        {messages.map((message, index) => <p key={`${index}-${message.role}`} className={`pausstik-chat-message ${message.role}`}>{message.content}</p>)}
        {busy && <p className="pausstik-chat-message assistant assistant-pending">Thinking…</p>}
        {error && <p className="pausstik-chat-error" role="alert">{error}</p>}
      </div>
      {messages.length === 1 && <div className="pausstik-chat-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(undefined, suggestion)} disabled={busy}>{suggestion}</button>)}</div>}
      <form onSubmit={(event) => void send(event)}>
        <label className="visually-hidden" htmlFor="pausstik-question">Ask Pausstik</label>
        <input id="pausstik-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a Pausstik question…" maxLength={1200} disabled={busy} />
        <button type="submit" aria-label="Send message" disabled={busy || !draft.trim()}>↑</button>
      </form>
      <small className="pausstik-chat-footnote">AI answers can be wrong. Confirm order, payment and account details in your workspace.</small>
    </section>}
    <button className="pausstik-assistant-launcher" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span aria-hidden="true">✦</span>{open ? "Close help" : "Pausstik help"}</button>
  </div>;
}
