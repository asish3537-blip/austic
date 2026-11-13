"use client";
import { useEffect, useTransition } from "react";
import { UiText,useUiLanguage } from "@/components/ui-language";
import { useRouter } from "next/navigation";
export function OrdersRefresh({ active }: { active: boolean }) {
  const {t}=useUiLanguage();
  const router = useRouter(); const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!active) return;
    const refresh = () => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); };
    const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [active, router]);
  return <button type="button" className="orders-refresh" aria-label={t("Refresh orders")} aria-busy={pending} title={t("Refresh orders")} disabled={pending} onClick={() => startTransition(() => router.refresh())}><span aria-hidden="true">↻</span><span className="orders-refresh-label"><UiText text={pending?"Refreshing…":"Refresh orders"}/></span></button>;
}
