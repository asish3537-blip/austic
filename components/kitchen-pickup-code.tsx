"use client";
import { useState } from "react";
export function KitchenPickupCode({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  async function load() {
    try {
      const response = await fetch("/api/mother/pickup-code?orderId=" + orderId, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode(data.code);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Code could not load."); }
  }
  return <div className="handover-code"><button type="button" className="plain-button" onClick={load}>Show kitchen pickup code</button>{code && <><strong>{code}</strong><small>Share with the assigned courier when handing over this order.</small></>}{error && <p role="status">{error}</p>}</div>;
}
