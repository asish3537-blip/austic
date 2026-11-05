"use client";
import { useEffect, useState } from "react";
import { KitchenAvatar } from "@/components/kitchen-avatar";
type Branding = { kind: "photo" | "logo"; image: string };
export function KitchenBrandingEditor() {
  const [branding, setBranding] = useState<Branding | null>(null), [kind, setKind] = useState<"photo" | "logo">("photo");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { const c = new AbortController(); fetch("/api/mother/kitchen/branding", { cache: "no-store", signal: c.signal }).then(r => r.ok ? r.json() : null).then(d => { if (d) { setBranding(d.branding); if (d.branding) setKind(d.branding.kind); } }).catch(() => {}); return () => c.abort(); }, []);
  async function save(file: File | null) {
    setBusy(true); setMessage("");
    try {
      let image: string | null = null;
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a PNG, JPG or WebP under 5 MB.");
        const bitmap = await createImageBitmap(file);
        try {
          const canvas = document.createElement("canvas"); canvas.width = canvas.height = 192;
          const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image editing is unavailable on this device.");
          ctx.fillStyle = "#fffdf8"; ctx.fillRect(0,0,192,192);
          const scale = kind === "logo" ? Math.min(192/bitmap.width,192/bitmap.height) : Math.max(192/bitmap.width,192/bitmap.height);
          const w = bitmap.width*scale, h = bitmap.height*scale; ctx.drawImage(bitmap,(192-w)/2,(192-h)/2,w,h);
          image = canvas.toDataURL("image/png");
        } finally { bitmap.close(); }
      }
      const r = await fetch("/api/mother/kitchen/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, kind }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Image could not save."); setBranding(d.branding); setMessage(d.message);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Image could not save."); } finally { setBusy(false); }
  }
  return <section className="kitchen-branding-editor"><KitchenAvatar name="Your kitchen" image={branding?.image} kind={branding?.kind}/><div><h2>Your kitchen identity</h2><p>Add your photo or kitchen logo so neighbours recognise you.</p><label>Image type<select aria-label="Image type" value={kind} disabled={busy} onChange={e => setKind(e.target.value as "photo" | "logo")}><option value="photo">Mother profile photo</option><option value="logo">Kitchen logo</option></select></label><label className="branding-upload">{busy ? "Saving image…" : "Choose photo or logo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void save(file); e.target.value = ""; }}/></label>{branding && <button className="plain-button" disabled={busy} onClick={() => void save(null)}>Remove image</button>}<small>PNG, JPG or WebP · up to 5 MB. Your image will be visible to customers.</small>{message && <p role="status">{message}</p>}</div></section>;
}
