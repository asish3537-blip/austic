"use client";
import Link from "next/link";
import { KitchenPickupCode } from "@/components/kitchen-pickup-code";
import {PartnerIncomePanel} from "@/components/partner-income-panel";
import {MEAL_PRICE_TIERS,type MealTierName} from "@/lib/marketplace-rules";
import {indiaDate} from "@/lib/service-windows";
import {SavedMealScheduler} from "@/components/saved-meal-scheduler";
import {MotherDashboardWelcome,MotherLicenceReminder} from "@/components/mother-dashboard-welcome";
import {OrderPhotos} from "@/components/order-photos";

import { UiText } from "@/components/ui-language";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type MenuItem = { ingredients?:string[]; allergens?:string[]; oneTimeOnly?:boolean; mealPeriod?:string; id: string; mealId: string; name: string; description: string | null; category: string; tier: string; components: string[]; deliveryTime: string; price: number; serviceDate: string; servings: number; isAvailable: boolean; isPublished: boolean };
type KitchenInfo = { id:string; name: string; approved: boolean; acceptingOrders: boolean; hasLocation: boolean; marketplaceRadiusKm: number; hasFssai:boolean; fssaiReview:string|null };
type MotherOrder = { id: string; orderNumber: string; status: string; customer: string; items: string[]; total: number; scheduledFor: string; deliveryStatus: string | null };
type Workspace = { kitchen: KitchenInfo; menus: MenuItem[]; orders: MotherOrder[]; earningsRecorded: number; currency: string };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value + "T00:00:00.000Z"));
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency.trim(), maximumFractionDigits: 0 }).format(value);
}

export function MotherWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [newSpecial,setNewSpecial]=useState(false);
  const [newMealVersion,setNewMealVersion]=useState(0);
  const [busyId, setBusyId] = useState("");
  const [menuDate,setMenuDate]=useState(()=>indiaDate(new Date()));
  const [allDates,setAllDates]=useState(false);
  const [marketplaceRadiusKm, setMarketplaceRadiusKm] = useState(25);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/mother/menu", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your kitchen workspace.");
      setWorkspace(data);
      setMarketplaceRadiusKm(25);
      setProblem("");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not load your kitchen workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    const poll=window.setInterval(()=>{if(document.visibilityState === "visible")void refresh();},15000);
    return () => {window.clearTimeout(timer);window.clearInterval(poll);};
  }, [refresh]);

  async function saveMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("menu");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const deliveryTime=String(form.get("deliveryTime")||"12:30");
    const hour=Number(deliveryTime.split(":")[0]);
    const payload = {
      name: String(form.get("name") || ""),
      description: String(form.get("description") || ""),
      oneTimeOnly: form.get("oneTimeOnly") === "on",
      tier: String(form.get("tier") || "BASE"),
      mealPeriod:hour<11?"BREAKFAST":hour<17?"LUNCH":"DINNER",
      components: [],
      price: Number(form.get("price")),
      servings: Number(form.get("servings")),
      serviceDate: editing?.serviceDate || String(form.get("serviceDate") || ""),
      deliveryTime,

    };
    try {
      const response = await fetch(editing ? "/api/mother/menu/" + editing.id : "/api/mother/menu", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, isAvailable: true } : payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this menu item.");
      setMessage(data.message || (data.published ? "Menu item updated and visible to customers." : "Menu item saved."));
      setMenuDate(payload.serviceDate);
      setEditing(null);
      formElement.reset();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this menu item.");
    } finally {
      setBusyId("");
    }
  }

  async function pinKitchen() {
    setBusyId("location");
    setMessage("Paustik uses your kitchen pin to check courier arrival. It is shared with the assigned courier for orders.");
    if (!navigator.geolocation) {
      setMessage("This device cannot provide browser location.");
      setBusyId("");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await fetch("/api/mother/kitchen/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, consent: true, marketplaceRadiusKm }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save the kitchen pickup pin.");
        setMessage(data.message);
        await refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save the kitchen pickup pin.");
      } finally {
        setBusyId("");
      }
    }, (error) => {
      setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was declined. Enable it in your browser settings to set a kitchen pickup pin." : "Could not read your location. Try again when GPS is available.");
      setBusyId("");
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  async function publishDrafts() {
    setBusyId("publish");
    setMessage("");
    try {
      const response = await fetch("/api/mother/menu/publish", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish your menu.");
      setMessage("Weekly menu published. Customers in your city can now order.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish your menu.");
    } finally {
      setBusyId("");
    }
  }

  async function updateOrder(order: MotherOrder, status: string) {
    setBusyId(order.id);
    setMessage("");
    try {
      const response = await fetch("/api/mother/orders/" + order.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this order.");
      setMessage("Order " + order.orderNumber + " updated.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this order.");
    } finally {
      setBusyId("");
    }
  }

  async function removeMenu(item: MenuItem) {
    setBusyId(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/mother/menu/" + item.id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove this menu item.");
      setMessage("Menu item removed from customer listings.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this menu item.");
    } finally {
      setBusyId("");
    }
  }

  const localToday = indiaDate(new Date());
  const visibleMenus=workspace?.menus.filter(item=>allDates||item.serviceDate===menuDate)??[];
  function editMeal(item:MenuItem){setEditing(item);window.setTimeout(()=>{document.getElementById("weekly-menu")?.scrollIntoView({block:"start"});document.querySelector<HTMLInputElement>(".mother-menu-editor input[name=name]")?.focus({preventScroll:true});},0);}
  function addMeal(special:boolean){setEditing(null);setNewSpecial(special);setNewMealVersion(v=>v+1);window.setTimeout(()=>{document.getElementById("weekly-menu")?.scrollIntoView({block:"start"});document.querySelector<HTMLInputElement>(".mother-menu-editor input[name=name]")?.focus({preventScroll:true});},0);}
  if (loading) return <div className="dashboard-banner"><UiText text="Loading your kitchen workspace…"/></div>;
  if (!workspace) return <div className="dashboard-banner admin-warning">{problem || "Your kitchen workspace could not load."}</div>;

  return <div className="mother-workspace">    {message && <p className="workspace-message" role="status"><UiText text={message}/></p>}
    {problem && <p className="workspace-message is-error" role="alert"><UiText text={problem}/></p>}
    {!workspace.kitchen.approved&&<aside className="mother-approval-banner"><strong><UiText text="Waiting for Paustik approval"/></strong><span><UiText text="You can add meals and products as drafts while we review your kitchen."/></span><Link href="/mother/quality"><UiText text="View application status"/> →</Link></aside>}
    <MotherLicenceReminder kitchenId={workspace.kitchen.id} hasFssai={workspace.kitchen.hasFssai} fssaiReview={workspace.kitchen.fssaiReview}/>
    <MotherDashboardWelcome kitchenName={workspace.kitchen.name} onAddMeal={addMeal}/>
    <PartnerIncomePanel role="MOTHER" compact/>
      <article className="dashboard-card mother-orders-panel">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Kitchen queue"/></span><h2 id="incoming-orders"><UiText text="Incoming orders"/></h2></div><span className="customer-count">{workspace.orders.length}</span></div>
        {workspace.orders.length ? <div className="workspace-record-list">{[...workspace.orders].sort((a,b)=>({ORDER_PLACED:0,CONFIRMED:1,PREPARING:2,DELIVERY_ASSIGNED:3,READY_FOR_PICKUP:4}[a.status]??5)-({ORDER_PLACED:0,CONFIRMED:1,PREPARING:2,DELIVERY_ASSIGNED:3,READY_FOR_PICKUP:4}[b.status]??5)).map((order) => <article key={order.id}>
          <div className="workspace-record-head"><strong>{order.orderNumber}</strong><span className={"customer-status customer-status-" + order.status.toLowerCase()}><UiText text={order.status.toLowerCase().replaceAll("_", " ")}/></span></div>
          <p>{order.customer} · {order.items.join(", ")}</p><small><UiText text="For"/>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(order.scheduledFor))} · {money(order.total, "INR")}</small>
          {order.status === "DELIVERY_ASSIGNED" && <KitchenPickupCode orderId={order.id} />}
          <OrderPhotos key={order.id+order.status} orderId={order.id} writable initiallyOpen={order.status==="PREPARING"||order.status==="DELIVERY_ASSIGNED"}/>
          <div className="workspace-record-actions">
            {order.status === "ORDER_PLACED" && <><button type="button" onClick={() => updateOrder(order, "CONFIRMED")} disabled={busyId === order.id}><UiText text="Accept order"/></button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}><UiText text="Decline"/></button></>}
            {order.status === "CONFIRMED" && <><button type="button" onClick={() => updateOrder(order, "PREPARING")} disabled={busyId === order.id}><UiText text="Start cooking"/></button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}><UiText text="Cancel"/></button></>}
            {order.status === "PREPARING" && <><button type="button" onClick={() => updateOrder(order, "READY_FOR_PICKUP")} disabled={busyId === order.id}><UiText text="Ready for courier"/></button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}><UiText text="Cancel"/></button></>}
            {order.status === "READY_FOR_PICKUP" && <span><UiText text="Waiting for an approved courier to claim."/></span>}
            {order.status === "DELIVERY_ASSIGNED" && <span><UiText text="Courier accepted this delivery."/></span>}
            {order.status === "PICKED_UP" && <span><UiText text="Courier picked up this order."/></span>}
            {order.status === "OUT_FOR_DELIVERY" && <span><UiText text="Courier is on the way to the customer."/></span>}
          </div>
        </article>)}</div> : <div className="customer-empty-state"><strong><UiText text="No open orders yet"/></strong><span><UiText text="New customer orders will appear here for you to accept and prepare."/></span></div>}
      </article>
    <section className="mother-work-grid" id="mother-orders">
      <article className="dashboard-card mother-menu-editor">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Weekly menu"/></span><h2 id="weekly-menu"><UiText text={editing ? "Update meal" : "Add a meal"}/></h2></div>{workspace.menus.some(item=>!item.isPublished)&&<button className="button button-quiet" type="button" onClick={publishDrafts} disabled={busyId === "publish" || !workspace.kitchen.approved || !workspace.kitchen.hasLocation}><UiText text={busyId === "publish" ? "Publishing…" : "Publish saved drafts"}/></button>}</div>
        {!workspace.kitchen.approved && <p className="mother-gate-note"><UiText text="Paustik must approve your kitchen before customers can order. You can save meal drafts now."/></p>}
        {workspace.kitchen.approved && !workspace.kitchen.hasLocation && <p className="mother-gate-note"><UiText text="Set your pickup pin before menu publishing. Pickup geofencing needs this verified location."/></p>}
        <p className="mother-menu-publish-note"><UiText text="Save and publish is one step when your kitchen is approved and its pickup pin is saved."/></p>
        <p className="mother-menu-steps"><UiText text="1. Meal and price"/> <span>→</span> <UiText text="2. Date and servings"/> <span>→</span> <UiText text="3. Save your menu"/></p>
        {editing&&<p className="mother-gate-note"><UiText text="Dish details apply to its scheduled dates. Servings and time apply to this date."/></p>}
        <form className="workspace-form mother-simple-menu-form" key={editing?.id || "new-meal-"+newMealVersion} onSubmit={saveMenu}>
          <label><UiText text="Meal name"/><input name="name" required minLength={3} maxLength={90} defaultValue={editing?.name??""} placeholder="e.g. Dalma lunch"/></label>
          <label><UiText text="Meal description"/><textarea name="description" required minLength={3} maxLength={800} rows={4} defaultValue={editing?.description||[editing?.components.join(", "),editing?.ingredients?.length?"Ingredients: "+editing.ingredients.join(", "):"",editing?.allergens?.length?"Allergens: "+editing.allergens.join(", "):""].filter(Boolean).join(". ")}/><small><UiText text="Describe the food. Include ingredients or allergy information here if needed."/></small></label>
          <div className="workspace-form-row"><label><UiText text="Meal type"/><select name="tier" defaultValue={editing?.tier??"BASE"} onChange={e=>{const price=e.currentTarget.form?.elements.namedItem("price") as HTMLInputElement|null;const rule=MEAL_PRICE_TIERS[e.target.value as MealTierName];const special=(e.currentTarget.form?.elements.namedItem("oneTimeOnly") as HTMLInputElement|null)?.checked;if(price&&!special&&Number(price.value)<rule.startingPrice)price.value=String(rule.startingPrice);}}>{Object.entries(MEAL_PRICE_TIERS).map(([value,rule])=><option value={value} key={value}><UiText text={rule.label}/> · ₹{rule.startingPrice}+</option>)}</select></label>
          <label><UiText text="Price (₹)"/><input name="price" type="number" min={1} step="1" required defaultValue={editing?.price??69}/><small><UiText text="Set your price from the selected starting price. No pilot business price cap."/></small></label></div>
          <label className="special-meal-choice"><input name="oneTimeOnly" type="checkbox" defaultChecked={editing?.oneTimeOnly??newSpecial}/><UiText text="One-day special · not part of a meal plan"/></label>
          <div className="workspace-form-row"><label><UiText text="Servings available"/><input name="servings" type="number" min={1} max={200} required defaultValue={editing?.servings??10}/></label><label><UiText text="Serving date"/><input name="serviceDate" type="date" min={localToday} required defaultValue={editing?.serviceDate??localToday} disabled={Boolean(editing)}/></label><label><UiText text="Delivery time (India)"/><input name="deliveryTime" type="time" min="06:00" max="21:00" required defaultValue={editing?.deliveryTime??"12:30"}/></label></div>
          <div className="workspace-form-actions"><button className="button button-warm" type="submit" disabled={busyId==="menu"}><UiText text={busyId==="menu"?"Saving…":editing?"Save changes":workspace.kitchen.approved&&workspace.kitchen.hasLocation&&workspace.kitchen.acceptingOrders?"Save and publish meal":"Save draft"}/></button>{editing&&<button className="button button-quiet" type="button" onClick={()=>setEditing(null)}><UiText text="Cancel edit"/></button>}</div>
          <p className="mother-menu-support"><UiText text="Timing or delivery problem?"/> <Link href="/help"><UiText text="Help & support"/> →</Link></p>
        </form>
        <SavedMealScheduler onSaved={refresh} revision={workspace.menus.length}/>
      </article>


    </section>

    <section className="dashboard-card mother-menu-list">
      <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Your kitchen"/></span><h2 id="scheduled-menu"><UiText text="Scheduled meals"/></h2></div><span className="customer-count">{visibleMenus.length}</span></div>
      <div className="mother-menu-date-controls"><label><UiText text="Serving date"/><input type="date" value={menuDate} onChange={e=>{setMenuDate(e.target.value);setAllDates(false);}}/></label><button type="button" aria-pressed={allDates} onClick={()=>setAllDates(v=>!v)}><UiText text={allDates?"Show selected day":"Show all scheduled dates"}/></button></div>
      {visibleMenus.length ? <div className="workspace-menu-list">{visibleMenus.map((item) => <article key={item.id}>
        <div><span className="meal-type-mark">{item.oneTimeOnly?"ONE-TIME SPECIAL":item.mealPeriod??"LUNCH"} · {item.tier} · <UiText text={item.category === "NON_VEGETARIAN" ? "NON-VEG" : "VEG"}/></span><strong>{item.name}</strong><small>{dateLabel(item.serviceDate)} · {item.deliveryTime} · {item.servings} <UiText text="servings ·"/>{money(item.price, "INR")}</small></div>
        <span className={"customer-status " + (item.isPublished && item.isAvailable ? "customer-status-active" : "customer-status-pending")}><UiText text={item.isPublished && item.isAvailable ? "Live" : "Draft"}/></span>
        <div className="workspace-record-actions"><button type="button" onClick={() => editMeal(item)}><UiText text="Edit"/></button><button type="button" onClick={() => removeMenu(item)} disabled={busyId === item.id}><UiText text="Remove"/></button></div>
      </article>)}</div> : <div className="customer-empty-state"><strong><UiText text="Your menu is empty"/></strong><span><UiText text="Add a meal and choose its date, servings and price to build the weekly menu."/></span></div>}
    </section>
    <details className="dashboard-card mother-kitchen-settings" open={!workspace.kitchen.approved||!workspace.kitchen.hasLocation}><summary><UiText text="Kitchen settings, approval & other tools"/></summary><section className="mother-summary-grid" id="kitchen-summary" aria-label="Kitchen status">
      <article><span><UiText text="Kitchen"/></span><strong>{workspace.kitchen.name}</strong><small><UiText text={workspace.kitchen.approved ? "Kitchen account approved" : "Waiting for Paustik approval"}/></small><Link href="/mother/quality"><UiText text="Check FSSAI & inspection status"/> →</Link></article>
      <article><span><UiText text="Menu items"/></span><strong>{workspace.menus.filter((item) => item.isPublished && item.isAvailable).length}</strong><small><UiText text="Live and available to customers"/></small></article>
      
    </section>

    <section className="mother-location-panel">
      <div><span className="eyebrow"><UiText text="Kitchen location"/></span><h2><UiText text={workspace.kitchen.hasLocation ? "Kitchen pin saved" : "Add your kitchen pickup pin"}/></h2><p><UiText text="Customers within 25 km can order when delivery is available. Use your pickup code for handover; GPS is optional."/></p><label className="mother-radius-setting"><UiText text="Customer delivery area"/><select value={marketplaceRadiusKm} onChange={(event) => setMarketplaceRadiusKm(Number(event.target.value))}>{[25].map((radius) => <option key={radius} value={radius}>{radius} <UiText text="km"/></option>)}</select></label></div>
      <button className="button button-small" type="button" onClick={pinKitchen} disabled={busyId === "location"}><UiText text={busyId === "location" ? "Waiting for GPS…" : workspace.kitchen.hasLocation ? "Refresh kitchen pin" : "Use this device location"}/></button>
    </section><nav className="mother-shortcuts" aria-label="Kitchen tools"><a href="#weekly-menu"><UiText text="Add / update meals ↓"/></a><Link href="/mother/marketplace#product-requests"><UiText text="Product requests →"/></Link><Link href="/mother/marketplace"><UiText text="Sell homemade products →"/></Link><Link href="/mother/bulk"><UiText text="Bulk bookings →"/></Link><Link href="/mother/quality"><UiText text="Photos, FSSAI & inspections →"/></Link><Link href="/mother-guide"><UiText text="Start your Mother Kitchen"/> →</Link></nav></details>
  </div>;
}
