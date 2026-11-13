"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
const subscribeSupport = () => () => {};
const pushSupported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
type Item = { id: string; title: string; body: string; createdAt: string; readAt: string | null };
export function NotificationCenter({ full = false }: { full?: boolean }) {
  const [items, setItems] = useState<Item[]>([]), [unread, setUnread] = useState(0), [open, setOpen] = useState(full);
  const [configured, setConfigured] = useState(false), [publicKey, setPublicKey] = useState("");
  const supported = useSyncExternalStore(subscribeSupport, pushSupported, () => false);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try { const r = await fetch("/api/notifications", { cache: "no-store" }); if (!r.ok) throw new Error("Inbox unavailable."); if (r.ok) { const d = await r.json(); if (active) { setItems(d.items); setUnread(d.unread); } } } catch { if (active) setMessage("Updates could not load. They will retry when your connection returns."); } finally { if (active) setLoading(false); }
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
        const permission = await Notification.requestPermission();
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
    try { const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) }); if (!r.ok) throw new Error(); setItems(current => current.map(item => !id || item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); setUnread(n => id ? Math.max(0,n-1) : 0); } catch { setMessage("Could not mark notifications as read. Try again."); }
  }
  return <div className={"notification-center " + (full ? "notification-full" : "")}>
    {!full && <button type="button" className="notification-bell" aria-expanded={open} onClick={() => setOpen(!open)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z"/><path d="M9 20h6"/></svg> Notifications{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</button>}
    {open && <section className="notification-panel" aria-label="Notifications"><div className="notification-panel-head"><strong>Your updates{unread > 0 ? ` · ${unread} unread` : ""}</strong>{!full && <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button>}</div>
      <div className="notification-settings"><strong>{enabled ? "Device push is on" : "Stay updated"}</strong><p>Order, kitchen, payment and delivery updates. Lock-screen messages hide account details.</p><button type="button" disabled={busy || (!enabled && !configured)} onClick={() => void manage(enabled ? "disable" : "enable")}>{busy ? "Updating…" : enabled ? "Turn off device push" : "Enable device push"}</button>{enabled && <button type="button" disabled={busy} onClick={() => void manage("test")}>Send test notification</button>}{!configured && <small>Push activation is pending. In-app updates are available now.</small>}{!supported && <small>Use a browser with Web Push support. On iPhone/iPad, open the installed Home Screen app.</small>}</div>
      {message && <p className="notification-message" role="status">{message}</p>}
      {unread > 0 && <button type="button" className="plain-button" onClick={() => void markRead()}>Mark all as read</button>}
      <ul>{items.slice(0,full ? 30 : 5).map(item => <li key={item.id} className={item.readAt ? "is-read" : "is-unread"}><strong>{item.title}</strong><p>{item.body}</p>{/scoofoo/i.test(item.title)&&<Link href="/school-tiffins">Open ScooFoo →</Link>}<small>{new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</small>{!item.readAt && <button type="button" onClick={() => void markRead(item.id)}>Mark as read</button>}</li>)}</ul>{!items.length && <p className="notification-empty">{loading ? "Loading your updates…" : "Your account updates will appear here."}</p>}{!full && <Link href="/notifications">Open notification inbox →</Link>}
    </section>}
  </div>;
}
