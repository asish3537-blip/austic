"use client";
import { UiText } from "@/components/ui-language";
import { useCallback, useEffect, useState } from "react";
export function KitchenPickupCode({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/mother/pickup-code?orderId=" + orderId, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode(data.code);setError("");
    } catch (cause) { setCode("");setError(cause instanceof Error ? cause.message : "Code could not load."); }
  }, [orderId]);
  useEffect(() => { const first=setTimeout(()=>void load(),0); const timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);return()=>{clearTimeout(first);clearInterval(timer);}; },[load]);
  return <div className="handover-code"><span><UiText text="Kitchen pickup OTP"/></span>{code ? <><strong>{code}</strong><small><UiText text="Give this six-digit code to your assigned courier only when handing over the food. GPS is not required."/></small></> : !error && <p role="status"><UiText text="Loading pickup code…"/></p>}<button type="button" className="plain-button" onClick={()=>void load()}><UiText text="Refresh pickup code"/></button>{error && <p role="status"><UiText text={error}/></p>}</div>;
}
