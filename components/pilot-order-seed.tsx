"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function PilotOrderSeed() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  async function create() { setBusy(true); try { const r = await fetch("/api/admin/pilot-orders", { method: "POST" }); const d = await r.json(); setMessage(r.ok ? d.message : d.error || "Could not prepare examples."); if (r.ok) router.refresh(); } catch { setMessage("Connection failed. Please try again."); } finally { setBusy(false); } }
  return <div className="pilot-order-seed"><p>Test orders use synthetic accounts and contain all eight order events, a completed delivery, simulated wallet settlement and food/delivery feedback. They send no notifications or bank payouts.</p><button type="button" className="button button-light" disabled={busy} onClick={create}>{busy ? "Preparing…" : "Prepare five test lifecycle orders"}</button>{message && <p role="status">{message}</p>}</div>;
}
