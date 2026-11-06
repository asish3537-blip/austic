"use client";

import { UiText, useUiLanguage } from "@/components/ui-language";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { kitchenMenuDate, kitchenMoney, mealCategoryLabel } from "@/lib/customer-kitchen-types";
import { groupPlanMenus, planTotals, selectedPlanMenus, togglePlanMenu, type PlanMenu } from "@/lib/customer-plan-selection";

export function WeeklyPlanPicker({ menus:allMenus, kitchenName, preview = false, canReserve = true }: { menus: PlanMenu[]; kitchenName: string; preview?: boolean; canReserve?: boolean }) {
  const { t } = useUiLanguage();
  const router = useRouter();
  const [period,setPeriod]=useState(allMenus.some(m=>(m.mealPeriod??"LUNCH")==="LUNCH")?"LUNCH":allMenus[0]?.mealPeriod??"LUNCH");
  const menus=allMenus.filter(m=>(m.mealPeriod??"LUNCH")===period);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [delivery,setDelivery]=useState<{available:boolean;message:string}|null>(null);const menuId=allMenus[0]?.menuId;
  useEffect(()=>{if(preview||!menuId)return;let active=true;const refresh=async()=>{try{const r=await fetch("/api/marketplace/delivery-availability?menuId="+encodeURIComponent(menuId),{cache:"no-store"});const d=await r.json();if(active)setDelivery(r.ok?d:{available:false,message:d.error||"Delivery availability could not load."});}catch{if(active)setDelivery({available:false,message:"Delivery availability could not load. Please refresh."});}};void refresh();const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},30000);return()=>{active=false;clearInterval(timer);};},[menuId,preview]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const groups = groupPlanMenus(menus);
  const chosen = selectedPlanMenus(menus, selected, quantity);
  const chosenIds = chosen.map((menu) => menu.menuId);
  const availableDays = groups.filter(([, options]) => options.some((menu) => menu.servings >= quantity));
  const totals = planTotals(chosen, quantity);
  const enoughDays = chosen.length >= 3 && chosen.length <= 7;

  function choose(menu: PlanMenu) {
    if (busy || menu.servings < quantity) return;
    setSelected(togglePlanMenu(menus, chosenIds, menu));
    setMessage("");
  }

  function selectFirstDays(count: number) {
    setSelected(availableDays.slice(0, count).map(([, options]) => options.find((menu) => menu.servings >= quantity)!.menuId));
    setMessage("");
  }

  async function createPlan() {
    if (busy || preview || !canReserve || !enoughDays || !delivery?.available) return;
    setBusy(true); setError(false); setMessage("");
    try {
      const response = await fetch("/api/customer/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuIds: chosenIds, quantity }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reserve those meal days.");
      setMessage(data.message + (data.orders.some((order: { amountDue: number }) => order.amountDue > 0) ? " Any amount not covered by your wallet remains due; no online payment was taken." : " Wallet credit covered each day."));
      router.push("/customer/orders#order-history");
      setSelected([]);
      window.dispatchEvent(new Event("paustik-wallet-updated"));
      router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Could not reserve those meal days."); }
    finally { setBusy(false); }
  }

  return <div className="kitchen-plan-builder">
    <div className="kitchen-plan-selection"><label>Subscription meal period<select value={period} onChange={e=>{setPeriod(e.target.value);setSelected([]);setMessage("");}}><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Light dinner</option></select><small>Each plan covers one period. Reserve a separate plan for another period.</small></label>
      <div className="kitchen-plan-settings"><div><h3><UiText text="1. Choose your days and meals"/></h3><p>Select one meal per day. You can change each choice before reserving.</p></div><label><UiText text="Servings per day"/><select aria-label={t("Servings per day")} value={quantity} disabled={busy} onChange={(event) => { const count = Number(event.target.value); setQuantity(count); setSelected(selectedPlanMenus(menus, selected, count).map((menu) => menu.menuId)); setMessage(""); }}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>
      <div className="kitchen-plan-mobile-review"><span><strong>{chosen.length} {chosen.length === 1 ? "day" : "days"} selected</strong><small>{kitchenMoney(totals.total)} including delivery</small></span><a href="#plan-summary-title">Review plan ↓</a></div>
      <div className="kitchen-plan-presets" role="group" aria-label="Quick selection"><span>Select first available days:</span>{[3, 5, 6, 7].map((count) => <button key={count} type="button" disabled={busy || availableDays.length < count} onClick={() => selectFirstDays(count)}>{count} days</button>)}<button type="button" disabled={busy || chosen.length === 0} onClick={() => { setSelected([]); setMessage(""); }}><UiText text="Clear"/></button></div>
      {availableDays.length < 3 && <p className="kitchen-plan-notice">This kitchen currently has {availableDays.length} available {availableDays.length === 1 ? "day" : "days"} for {quantity} {quantity === 1 ? "serving" : "servings"}. A subscription needs at least three days. Try fewer servings or order an available meal for one day.</p>}
      <div className="kitchen-plan-days">{groups.map(([day, dayMenus]) => <fieldset key={day} className="kitchen-plan-day" disabled={busy}><legend>{kitchenMenuDate(day)}</legend><div>{dayMenus.map((menu) => {
        const checked = chosenIds.includes(menu.menuId);
        const unavailable = menu.servings < quantity;
        return <label key={menu.menuId} className={(checked ? "is-selected " : "") + (unavailable ? "is-unavailable" : "")}><input type="checkbox" checked={checked} disabled={unavailable} onChange={() => choose(menu)} /><span><strong>{menu.name}</strong>{menu.category && <small className={menu.category === "NON_VEGETARIAN" ? "kitchen-option-nonveg" : "kitchen-option-veg"}>{mealCategoryLabel(menu.category)}</small>}{menu.components && <small>{menu.components.join(" · ")}</small>}<small>{menu.deliveryTime ?? "12:30"} IST · {preview ? "Sample availability" : unavailable ? `Only ${menu.servings} servings left` : `${menu.servings} servings left`}</small></span><b>{kitchenMoney(menu.price)}<small>/ serving</small></b></label>;
      })}</div></fieldset>)}</div>
    </div>
    <aside className="kitchen-plan-summary" aria-labelledby="plan-summary-title">
      <span className="eyebrow">Your weekly table</span><h3 id="plan-summary-title"><UiText text="2. Review your subscription"/></h3><p>{kitchenName}</p>
      <div className="kitchen-plan-progress" role="status"><strong>{chosen.length} of 7 days selected</strong><span>{chosen.length < 3 ? `Choose ${3 - chosen.length} more ${3 - chosen.length === 1 ? "day" : "days"} to reach the minimum` : `${quantity} ${quantity === 1 ? "serving" : "servings"} each day · ready to reserve`}</span></div>
      {chosen.length ? <ul className="kitchen-plan-chosen">{chosen.map((menu) => <li key={menu.menuId}><span><strong>{kitchenMenuDate(menu.serviceDate)}</strong><small>{quantity} × {menu.name}</small></span><b>{kitchenMoney(menu.price * quantity)}</b></li>)}</ul> : <p className="kitchen-plan-placeholder">Your chosen meals and total will appear here.</p>}
      <dl className="kitchen-plan-totals"><div><dt>Meals · {chosen.length * quantity} servings</dt><dd>{kitchenMoney(totals.meals)}</dd></div><div><dt>Delivery · {chosen.length} × ₹30</dt><dd>{kitchenMoney(totals.delivery)}</dd></div><div className="kitchen-plan-total"><dt><UiText text="Total before wallet credit"/></dt><dd>{kitchenMoney(totals.total)}</dd></div></dl>
      <p className="kitchen-plan-payment">{preview ? "Preview total only. No booking or payment is created." : "Wallet credit is applied when you reserve. Any remaining balance is due outside the app; no online payment is taken."}</p>
      {!preview&&<p className="kitchen-plan-notice" role="status">{delivery?.message??"Checking delivery partners…"}</p>}{!preview && !canReserve && <p className="kitchen-plan-notice">Set your delivery pin above to confirm delivery before reserving.</p>}
      {!preview && !enoughDays && <p className="kitchen-plan-notice" id="reservation-minimum"><UiText text="A subscription requires at least three different days; multiple servings on one day still count as one day."/>{availableDays.length >= 3 && <button type="button" className="button button-light" disabled={busy} onClick={() => selectFirstDays(3)}><UiText text="Select first 3 available days"/></button>}</p>}
      <button className="button" type="button" aria-describedby={!enoughDays ? "reservation-minimum" : undefined} disabled={busy || !enoughDays || preview || !canReserve || !delivery?.available} onClick={createPlan}>{preview ? "Sample subscription" : busy ? "Reserving your meals…" : !enoughDays ? <UiText text="Choose at least 3 days"/> : <UiText text="Reserve selected meal days"/>}</button>
      <small className="kitchen-plan-terms">One week only. No automatic renewal. Cancel a day 5+ hours before delivery; eligible paid value less ₹5 returns to your wallet.</small>
      {message && <div className={"kitchen-plan-message " + (error ? "is-error" : "")} role={error ? "alert" : "status"}><p>{message}</p>{!error && <Link href="/customer/orders#order-history">View my orders and plans →</Link>}</div>}
    </aside>
  </div>;
}
