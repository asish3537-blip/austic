"use client";
import { useEffect, useTransition } from "react";
import { UiText } from "@/components/ui-language";
import { useRouter } from "next/navigation";
export function OrdersRefresh({ active }: { active: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!active) return;
    const refresh = () => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); };
    const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [active, router]);
  return <button type="button" className="orders-refresh" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Refreshing…" : <><span aria-hidden="true">↻ </span><UiText text="Refresh orders"/></>}</button>;
}
