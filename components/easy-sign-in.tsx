"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import Link from "next/link";
import { afterSignIn } from "@/lib/kitchen-handoff";
import {useUiLanguage} from "@/components/ui-language";

type GoogleIdentity = { initialize(options: { client_id: string; nonce: string; callback: (result: { credential: string }) => void }): void; renderButton(node: HTMLElement, options: Record<string, unknown>): void };
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }

export function EasySignIn({ googleEnabled, emailEnabled, kitchen, initialError }: { googleEnabled: boolean; emailEnabled: boolean; kitchen?: string; initialError?: string }) {
  const {t,language}=useUiLanguage();
  const googleButton = useRef<HTMLDivElement>(null);
  const codeInput=useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [remaining,setRemaining]=useState(0);

  useEffect(()=>{if(sent)codeInput.current?.focus();},[sent]);
  useEffect(()=>{if(!resendAt)return;const tick=()=>setRemaining(Math.max(0,Math.ceil((resendAt-Date.now())/1000)));const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[resendAt]);

  useEffect(() => {
    if (!ready || !googleEnabled || !window.google || !googleButton.current) return;
    let cancelled = false;
    async function initialize() {
      try {
        const response = await fetch("/api/auth/google/challenge", { method: "POST" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (cancelled || !googleButton.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: data.clientId, nonce: data.nonce, callback: async ({ credential }) => {
          setBusy(true); setError("");
          try {
            const result = await fetch("/api/auth/google/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
            const body = await result.json();
            if (!result.ok) throw new Error(body.error);
            window.location.assign(afterSignIn(body.destination, kitchen));
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Google sign-in failed. Reload to try again, or use email."); setBusy(false); }
        } });
        window.google.accounts.id.renderButton(googleButton.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular",locale:language });
      } catch { if (!cancelled) setError("Google sign-in could not load. Use email, or reload to try again."); }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [ready, googleEnabled, kitchen,language]);

  async function requestCode() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/email-code/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSent(true); setCode(""); setMessage(body.message); setRemaining(60);setResendAt(Date.now() + 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send your code. Try again."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) { await requestCode(); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/email-code/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      window.location.assign(afterSignIn(body.destination, kitchen));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in. Try again."); setBusy(false); }
  }
  return <section className="easy-sign-in" aria-label={t("Quick sign-in")} aria-busy={busy}>
    <h2>{t("Sign in with ease")}</h2><p>{t("Choose the sign-in method that suits you.")}</p>
    {googleEnabled && <><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError("Google could not load. Use email instead.")} /><div className="easy-google-button" ref={googleButton} aria-label={t("Continue with Google")} /><p className="sign-in-method-note">{t("Google can create your customer account or reopen your existing account.")}</p></>}
    {googleEnabled&&emailEnabled&&<div className="sign-in-separator">{t("or continue with email")}</div>}
    {error && <p className="form-alert" role="alert">{t(error)}</p>}
    {emailEnabled && <form onSubmit={submit}>
      <p id="quick-email-help" className="sign-in-method-note">{t("Already have an account? Get a code by email. No password needed.")}</p>
      <div className="field"><label htmlFor="quick-email">{t("Email address")}</label><input id="quick-email" type="email" autoComplete="email" aria-describedby="quick-email-help" required maxLength={254} disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setSent(false); setCode(""); setMessage("");setError("");setResendAt(0); }} /></div>
      {sent && <div className="field"><label htmlFor="quick-code">{t("Six-digit email code")}</label><input ref={codeInput} id="quick-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code} onChange={event => setCode(event.target.value.replace(/\D/g,""))} /><small>{t("Enter the code here. Never share it in chat.")}</small></div>}
      {message && <p className="form-success" role="status">{t(message)}</p>}
      <button className="button form-submit" disabled={busy}>{t(busy ? "Please wait…" : sent ? "Sign in with code" : "Email me a code")}</button>
      {sent && <button type="button" className="sign-in-resend" disabled={busy||remaining>0} onClick={() => { if (Date.now() < resendAt) return; void requestCode(); }}>{remaining>0?t("Send again in {seconds}s",{seconds:remaining}):t("Send a new code")}</button>}
    </form>}
    <p className="form-footer">{t("New here?")} <Link href="/sign-up">{t("Create an account with email")}</Link></p>
  </section>;
}
