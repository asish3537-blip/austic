"use client";
import {UiText,UiDate} from "@/components/ui-language";

import Link from "next/link";
import {isNewNotification} from "@/lib/notification-feed";
import {AppIcon} from "@/components/app-icon";
import { useEffect, useState, useSyncExternalStore } from "react";
const subscribeSupport = () => () => {};
const pushSupported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
type Item = { id: string; title: string; body: string; createdAt: string; readAt: string | null };
export function NotificationCenter({ full = false, settings = false }: { full?: boolean; settings?: boolean }) {
  const [view,setView]=useState<"new"|"earlier">("new");
  const [ordersHref,setOrdersHref]=useState("/app");
  const [items, setItems] = useState<Item[]>([]), [unread, setUnread] = useState(0), [open, setOpen] = useState(full);
  const [configured, setConfigured] = useState(false), [publicKey, setPublicKey] = useState("");
  const supported = useSyncExternalStore(subscribeSupport, pushSupported, () => false);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try { const r = await fetch("/api/notifications", { cache: "no-store" }); if (!r.ok) throw new Error("Inbox unavailable."); if (r.ok) { const d = await r.json(); if (active) { setItems(d.items); setUnread(d.unread);setOrdersHref(d.ordersHref||"/app"); } } } catch { if (active) setMessage("Updates could not load. They will retry when your connection returns."); } finally { if (active) setLoading(false); }
    };
    void load();
    fetch("/api/push", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(async d => {
      if (!d || !active) return; setConfigured(d.configured); setPublicKey(d.publicKey || "");
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
        if (sub) { const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", endpoint: sub.endpoint }) }); const status = await r.json(); if (active) setEnabled(status.enabled === true); }
      }
    }).catch(() => {});
    const timer = setInterval(load, 30000); window.addEventListener("focus", load);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, []);
  async function manage(action: "enable" | "disable" | "test") {
    setBusy(true); setMessage("");
    try {
      if (!supported) throw new Error("Push is unavailable in this browser. On iPhone/iPad, install Paustik from Safari and open it from the Home Screen. Your inbox still works.");
      if (action === "enable") {
        if (!configured || !publicKey) throw new Error("Push activation is pending. Your inbox still works.");
        const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notifications were not allowed. You can change this in your browser’s site settings.");
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (action === "enable") {
        if (!configured || !publicKey) throw new Error("Push activation is pending. Your inbox still works.");
        if (!sub) {
          const padding = "=".repeat((4 - publicKey.length % 4) % 4), bytes = atob((publicKey + padding).replace(/-/g,"+").replace(/_/g,"/"));
          const key = Uint8Array.from(bytes, c => c.charCodeAt(0));
          sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        }
      }
      if (!sub) throw new Error("Enable this device first.");
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action === "enable" ? "subscribe" : action === "disable" ? "unsubscribe" : "test", ...sub.toJSON(), endpoint: sub.endpoint }) });
      const d = await r.json(); if (!r.ok) { if (action === "enable") await sub.unsubscribe(); throw new Error(d.error || "Notification settings could not save."); }
      if (action === "disable") { await sub.unsubscribe(); setEnabled(false); const shown = await registration.getNotifications(); shown.forEach(n => n.close()); }
      if (action === "enable") setEnabled(true);
      setMessage(d.message || (action === "enable" ? "Notifications enabled for this device and sign-in session." : "Notifications disabled on this device."));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Notification settings are unavailable."); } finally { setBusy(false); }
  }
  async function markRead(id?: string) {
    try { const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) }); if (!r.ok) throw new Error(); setItems(current => current.map(item => !id || item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); setUnread(n => id ? Math.max(0,n-(items.some(item=>item.id===id&&isNewNotification(item))?1:0)) : 0); window.dispatchEvent(new Event("paustik-notifications-changed")); } catch { setMessage("Could not mark notifications as read. Try again."); }
  }
  const newItems=items.filter(item=>isNewNotification(item));
  const shown=(view==="new"?newItems:items.filter(item=>!isNewNotification(item)));
  return <div className={"notification-center " + (full ? "notification-full" : "")}>
    {!full && <button type="button" className="notification-bell" aria-expanded={open} onClick={() => setOpen(!open)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z"/><path d="M9 20h6"/></svg>{" "}<UiText text={"Notifications"}/>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</button>}
    {open && <section className="notification-panel" aria-label="Notifications"><div className="notification-panel-head"><strong><UiText text={"Your updates"}/><UiText text={unread > 0 ? ` · ${unread} unread` : ""}/></strong>{!full && <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button>}</div>
      {settings&&<div className="notification-settings"><strong><UiText text={enabled ? "Device push is on" : "Stay updated"}/></strong><p><UiText text={"Order, kitchen, payment and delivery updates. Lock-screen messages hide account details."}/></p><button type="button" disabled={busy || (!enabled && !configured)} onClick={() => void manage(enabled ? "disable" : "enable")}><UiText text={busy ? "Updating…" : enabled ? "Turn off device push" : "Enable device push"}/></button>{enabled && <button type="button" disabled={busy} onClick={() => void manage("test")}><UiText text={"Send test notification"}/></button>}{!configured && <small><UiText text={"Push activation is pending. In-app updates are available now."}/></small>}{!supported && <small><UiText text={"Use a browser with Web Push support. On iPhone/iPad, open the installed Home Screen app."}/></small>}</div>}
      {message && <p className="notification-message" role="status"><UiText text={message}/></p>}
      <nav className="notification-feed-tabs" aria-label="Notification view"><button type="button" aria-pressed={view==="new"} onClick={()=>setView("new")}><UiText text="New updates"/> <b>{newItems.length}</b></button><button type="button" aria-pressed={view==="earlier"} onClick={()=>setView("earlier")}><UiText text="Earlier updates"/></button><Link href={ordersHref}><UiText text="Explore orders"/> ↗</Link></nav><p className="notification-feed-note"><UiText text={view==="new"?"Unread updates from the last 24 hours. View active orders for the full status.":"Older and read updates stay here. No records have been removed."}/></p>{view==="earlier"&&items.some(item=>!item.readAt)&&<button type="button" className="plain-button" onClick={()=>void markRead()}><UiText text="Mark all updates as read"/></button>}
      <ul>{shown.slice(0,full ? 30 : 5).map(item => <li key={item.id} className={item.readAt ? "is-read" : "is-unread"}><span className="notification-row-icon" aria-hidden="true"><AppIcon name="bell"/></span><strong><UiText text={item.title}/></strong><p><UiText text={item.body}/></p>{/scoofoo/i.test(item.title)&&<Link href="/school-tiffins"><UiText text={"Open ScooFoo →"}/></Link>}<small><UiDate value={item.createdAt}/>{" "}<UiText text={"IST"}/></small>{!item.readAt && <button type="button" onClick={() => void markRead(item.id)}><UiText text={"Mark as read"}/></button>}</li>)}</ul>{!shown.length && <p className="notification-empty"><AppIcon name="bell"/><UiText text={loading ? "Loading your updates…" : view==="new"?"You’re all caught up. New order updates will appear here.":"No earlier updates yet."}/></p>}{!full && <Link href="/notifications"><UiText text={"Open notification inbox →"}/></Link>}
    </section>}
  </div>;
}
