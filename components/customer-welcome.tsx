"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { UiText } from "@/components/ui-language";

/** A first-visit invitation; browsing never requires registration. */
export function CustomerWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { if (sessionStorage.getItem("paustik-welcome-dismissed")) return; } catch {}
    fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(response => { if (response.status === 401) timer = setTimeout(() => dialog.current?.showModal(), 900); })
      .catch(() => {});
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  function dismiss() {
    try { sessionStorage.setItem("paustik-welcome-dismissed", "1"); } catch {}
    dialog.current?.close();
  }
  return <dialog ref={dialog} className="customer-welcome" aria-labelledby="welcome-title" onCancel={dismiss} onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className="customer-welcome-content">
      <button className="welcome-close" onClick={dismiss} aria-label="Close">×</button>
      <h2 id="welcome-title"><UiText text="Welcome to Paustik"/></h2>
      <p><UiText text="Find meals nearby"/></p>
      <div className="welcome-actions"><Link className="button" href="/sign-up" onClick={dismiss}><UiText text="Create your account"/></Link><Link className="button button-light" href="/sign-in" onClick={dismiss}><UiText text="Sign in"/></Link></div>
      <button className="welcome-browse" onClick={dismiss}><UiText text="Continue browsing"/></button>
      <div className="welcome-partners"><Link href="/join/mother"><UiText text="Mother entrepreneur"/></Link><Link href="/join/delivery"><UiText text="Delivery agent"/></Link></div>
    </div>
  </dialog>;
}
