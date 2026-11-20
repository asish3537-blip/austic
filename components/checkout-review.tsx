"use client";
import {UiText,useUiLanguage} from "@/components/ui-language";

import { useEffect, useState } from "react";
import { incomeMoney } from "@/lib/earnings-estimates";

export type CheckoutSelection = { menuIds?: string[]; quantity: number; productRequestId?: string };
export type CheckoutQuote = { quoteId: string; expiresAt: string; subtotal: number; deliveryFee: number; discount: number; total: number; walletApplied: number; amountDue: number; couponCode: string; distanceKm: number; feeRule?: {firstDeliveryFree?: boolean}; selectionKey: string };

export function useCheckoutQuote(selection: CheckoutSelection | null) {
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState("");
  const selectionKey = JSON.stringify({ ...selection, couponCode: appliedCode });
  const enabled = selection !== null;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: selectionKey, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Your total could not load.");
        if (!controller.signal.aborted) { setResult({ ...data, selectionKey }); setError(""); }
      } catch (cause) {
        if (!controller.signal.aborted) { setResult(null); setError(cause instanceof Error ? cause.message : "Your total could not load."); }
      }
    }
    const first = setTimeout(()=>void refresh(),0);
    const onVisibility = () => { if(document.visibilityState === "visible")void refresh(); else setResult(null); };
    document.addEventListener("visibilitychange",onVisibility);
    const timer = setInterval(() => { void refresh(); }, 14 * 60_000);
    return () => { controller.abort(); clearTimeout(first); clearInterval(timer); document.removeEventListener("visibilitychange",onVisibility); };
  }, [selectionKey, enabled, revision]);
  const quote = enabled && result?.selectionKey === selectionKey ? result : null;
  return { quote, error, code, setCode, apply: () => { setAppliedCode(code.trim().toUpperCase()); setRevision(n => n + 1); }, clear: () => { setCode(""); setAppliedCode(""); setRevision(n => n + 1); } };
}

export function CheckoutReview({ review }: { review: ReturnType<typeof useCheckoutQuote> }) {
  const {t}=useUiLanguage();
  const q = review.quote;
  return <section className="checkout-review" aria-label="Review your payment">
    <div className="coupon-entry"><label><UiText text={"Coupon or voucher"}/><input aria-label={t("Coupon or voucher")} value={review.code} maxLength={40} onChange={e => review.setCode(e.target.value)} placeholder={t("Enter code")} autoCapitalize="characters" /></label><button className="button button-quiet" type="button" onClick={review.apply}><UiText text={"Apply"}/></button>{review.code && <button type="button" className="plain-button" onClick={review.clear}><UiText text={"Remove"}/></button>}</div>
    {review.error && <p role="alert"><UiText text={review.error}/> <button type="button" className="plain-button" onClick={review.apply}><UiText text={"Retry"}/></button></p>}
    {!q && !review.error && <p role="status"><UiText text={"Calculating your delivery and total…"}/></p>}
    {q && <><dl><div><dt><UiText text={"Food subtotal"}/></dt><dd>{incomeMoney(q.subtotal)}</dd></div><div><dt>{q.feeRule?.firstDeliveryFree ? <UiText text="Delivery · first delivery free"/> : <UiText text="Delivery · {distance} km estimate" values={{distance:q.distanceKm.toFixed(1)}}/>}</dt><dd>{incomeMoney(q.deliveryFee)}</dd></div>{q.discount > 0 && <div className="checkout-saving"><dt><UiText text={"Coupon"}/>{" "}{q.couponCode}</dt><dd>−{incomeMoney(q.discount)}</dd></div>}<div><dt><UiText text={"Order total"}/></dt><dd>{incomeMoney(q.total)}</dd></div><div><dt><UiText text={"Wallet credit"}/></dt><dd>−{incomeMoney(q.walletApplied)}</dd></div><div className="checkout-payable"><dt><UiText text={"Remaining payable"}/></dt><dd>{incomeMoney(q.amountDue)}</dd></div></dl><small><UiText text={"Quote valid for 15 minutes. Delivery uses the distance between saved pins. Wallet credit is checked again when you confirm."}/></small></>}
  </section>;
}
