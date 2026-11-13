"use client";
import Link from "next/link";
import { KitchenPickupCode } from "@/components/kitchen-pickup-code";

import { UiText } from "@/components/ui-language";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type MenuItem = { oneTimeOnly?:boolean; mealPeriod?:string; id: string; mealId: string; name: string; description: string | null; category: string; tier: string; components: string[]; deliveryTime: string; price: number; serviceDate: string; servings: number; isAvailable: boolean; isPublished: boolean };
type KitchenInfo = { name: string; approved: boolean; acceptingOrders: boolean; hasLocation: boolean; marketplaceRadiusKm: number };
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
  const [busyId, setBusyId] = useState("");
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
    const payload = {
      name: String(form.get("name") || ""),
      description: String(form.get("description") || ""),
      oneTimeOnly: form.get("oneTimeOnly") === "on",
      tier: String(form.get("tier") || "BASE"),
      mealPeriod:String(form.get("mealPeriod")||"LUNCH"),
      components: [String(form.get("component1") || ""), String(form.get("component2") || ""), String(form.get("component3") || "")].filter(v=>v.trim()),
      price: Number(form.get("price")),
      servings: Number(form.get("servings")),
      serviceDate: String(form.get("serviceDate") || ""),
      deliveryTime: String(form.get("deliveryTime") || "12:30"),
      ingredients: String(form.get("ingredients") || ""),
      allergens: String(form.get("allergens") || ""),
    };
    try {
      const response = await fetch(editing ? "/api/mother/menu/" + editing.id : "/api/mother/menu", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, isAvailable: true } : payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this menu item.");
      setMessage(data.message || (data.published ? "Menu item updated and visible to customers." : "Menu item saved."));
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

  const today = new Date();
  const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  const minimumPrice = editing?.oneTimeOnly ? 1 : editing?.tier === "EGG" ? 79 : editing?.tier === "CHEESE" ? 89 : editing?.tier === "CHICKEN" ? 99 : 69;
  const maximumPrice = editing?.oneTimeOnly ? 10000 : editing?.tier === "CHICKEN" ? 100 : 500;
  if (loading) return <div className="dashboard-banner"><UiText text="Loading your kitchen workspace…"/></div>;
  if (!workspace) return <div className="dashboard-banner admin-warning">{problem || "Your kitchen workspace could not load."}</div>;

  return <div className="mother-workspace">    {message && <p className="workspace-message" role="status"><UiText text={message}/></p>}
    {problem && <p className="workspace-message is-error" role="alert"><UiText text={problem}/></p>}
      <article className="dashboard-card mother-orders-panel">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Kitchen queue"/></span><h2 id="incoming-orders"><UiText text="Incoming orders"/></h2></div><span className="customer-count">{workspace.orders.length}</span></div>
        {workspace.orders.length ? <div className="workspace-record-list">{[...workspace.orders].sort((a,b)=>({ORDER_PLACED:0,CONFIRMED:1,PREPARING:2,DELIVERY_ASSIGNED:3,READY_FOR_PICKUP:4}[a.status]??5)-({ORDER_PLACED:0,CONFIRMED:1,PREPARING:2,DELIVERY_ASSIGNED:3,READY_FOR_PICKUP:4}[b.status]??5)).map((order) => <article key={order.id}>
          <div className="workspace-record-head"><strong>{order.orderNumber}</strong><span className={"customer-status customer-status-" + order.status.toLowerCase()}><UiText text={order.status.toLowerCase().replaceAll("_", " ")}/></span></div>
          <p>{order.customer} · {order.items.join(", ")}</p><small><UiText text="For"/>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(order.scheduledFor))} · {money(order.total, "INR")}</small>
          {order.status === "DELIVERY_ASSIGNED" && <KitchenPickupCode orderId={order.id} />}
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
    <nav className="task-jumps" aria-label="Kitchen shortcuts"><a href="#weekly-menu"><UiText text="Add / update meals ↓"/></a><a href="/mother/marketplace#product-requests"><UiText text="Product requests →"/></a><a href="/mother/marketplace"><UiText text="Sell homemade products →"/></a></nav>
    <nav className="customer-quick-links" aria-label="Kitchen tools"><Link href="/mother/bulk"><UiText text="Bulk bookings →"/></Link><Link href="/mother/quality"><UiText text="Photos, FSSAI & inspections →"/></Link></nav>
    <section className="mother-summary-grid" id="kitchen-summary" aria-label="Kitchen status">
      <article><span><UiText text="Kitchen"/></span><strong>{workspace.kitchen.name}</strong><small><UiText text={workspace.kitchen.approved ? "Paustik verified" : "Waiting for Paustik approval"}/></small></article>
      <article><span><UiText text="Menu items"/></span><strong>{workspace.menus.filter((item) => item.isPublished && item.isAvailable).length}</strong><small><UiText text="Live and available to customers"/></small></article>
      
    </section>

    <section className="mother-location-panel">
      <div><span className="eyebrow"><UiText text="Kitchen location"/></span><h2><UiText text={workspace.kitchen.hasLocation ? "Kitchen pin saved" : "Add your kitchen pickup pin"}/></h2><p><UiText text="Customer delivery covers up to 25 km. Couriers still use the separate 150 m pickup geofence at this pin."/></p><label className="mother-radius-setting"><UiText text="Customer delivery area"/><select value={marketplaceRadiusKm} onChange={(event) => setMarketplaceRadiusKm(Number(event.target.value))}>{[25].map((radius) => <option key={radius} value={radius}>{radius} <UiText text="km"/></option>)}</select></label></div>
      <button className="button button-small" type="button" onClick={pinKitchen} disabled={busyId === "location"}>{busyId === "location" ? "Waiting for GPS…" : workspace.kitchen.hasLocation ? "Refresh kitchen pin" : "Use this device location"}</button>
    </section>



    <section className="mother-work-grid" id="mother-orders">
      <article className="dashboard-card mother-menu-editor">
        <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Weekly menu"/></span><h2 id="weekly-menu"><UiText text={editing ? "Update meal" : "Add a meal"}/></h2></div><button className="button button-quiet" type="button" onClick={publishDrafts} disabled={busyId === "publish" || !workspace.kitchen.approved || !workspace.kitchen.hasLocation}><UiText text={busyId === "publish" ? "Publishing…" : "Publish menu"}/></button></div>
        {!workspace.kitchen.approved && <p className="mother-gate-note"><UiText text="Paustik must approve your kitchen before customers can order. You can save meal drafts now."/></p>}
        {workspace.kitchen.approved && !workspace.kitchen.hasLocation && <p className="mother-gate-note"><UiText text="Set your pickup pin before menu publishing. Pickup geofencing needs this verified location."/></p>}
        <form className="workspace-form" key={editing?.id || "new-meal"} onSubmit={saveMenu}>
          <label className="special-meal-choice"><input name="oneTimeOnly" type="checkbox" defaultChecked={editing?.oneTimeOnly} onChange={event=>{const price=event.currentTarget.form?.elements.namedItem("price") as HTMLInputElement|null;if(price){price.min=event.currentTarget.checked?"1":"69";price.max=event.currentTarget.checked?"10000":"500";}}}/> <UiText text="One-time special · cook only on this selected date"/></label><small><UiText text="For occasional dishes such as biryani on Thursday, Friday or Sunday. Set your own price and 1–3 components. These specials are excluded from subscriptions."/></small><label><UiText text="Meal period"/><select name="mealPeriod" defaultValue={editing?.mealPeriod??"LUNCH"} onChange={e=>{const field=e.currentTarget.form?.elements.namedItem("deliveryTime") as HTMLInputElement|null;if(field)field.value=({BREAKFAST:"08:30",LUNCH:"12:30",DINNER:"19:30"} as Record<string,string>)[e.target.value];}}><option value="BREAKFAST"><UiText text="Breakfast"/></option><option value="LUNCH"><UiText text="Lunch"/></option><option value="DINNER"><UiText text="Light dinner"/></option></select><small><UiText text="Breakfast 06:00–10:59 · lunch 11:00–16:59 · dinner 17:00–21:00 IST. Dinner delivery ends by 9 p.m."/></small></label><label><UiText text="Meal name"/><input name="name" required minLength={3} maxLength={90} defaultValue={editing?.name ?? ""} placeholder="e.g. Dalma, rice and seasonal sides" /></label>
          <label><UiText text="Description"/><input name="description" maxLength={400} defaultValue={editing?.description ?? ""} placeholder="What comes in the lunch box?" /></label>
          <div className="workspace-form-row">
            <label><UiText text="Meal tier"/><select name="tier" defaultValue={editing?.tier ?? "BASE"} onChange={(event) => { const price = event.currentTarget.form?.elements.namedItem("price") as HTMLInputElement | null; const special = (event.currentTarget.form?.elements.namedItem("oneTimeOnly") as HTMLInputElement | null)?.checked; const limits = special ? {min:1,max:10000} : ({ BASE: { min: 69, max: 500 }, EGG: { min: 79, max: 500 }, CHEESE: { min: 89, max: 500 }, CHICKEN: { min: 99, max: 100 } } as Record<string, { min: number; max: number }>)[event.currentTarget.value] || { min: 69, max: 500 }; if (price) { price.min = String(limits.min); price.max = String(limits.max); if (!special) price.value = String(limits.min); } }}><option value="BASE"><UiText text="Base meal · from ₹69"/></option><option value="EGG"><UiText text="Egg meal · from ₹79"/></option><option value="CHEESE"><UiText text="Cheese meal · from ₹89"/></option><option value="CHICKEN"><UiText text="Chicken meal · ₹99–₹100"/></option></select></label>
            <label><UiText text="Price (₹)"/><input name="price" type="number" min={minimumPrice} max={maximumPrice} step="1" required defaultValue={editing?.price ?? 69} /><small><UiText text="Regular meals start at ₹69 / ₹79 / ₹89 / ₹99; regular chicken is capped at ₹100. One-time specials can use their own price."/></small></label>
          </div>
          <div className="workspace-form-row">
            <p><UiText text="Regular lunch has three components. One-time specials, breakfast and light dinner can have one to three."/></p><label><UiText text="Meal component 1"/><input name="component1" required maxLength={70} defaultValue={editing?.components[0] ?? ""} placeholder="e.g. rice" /></label>
            <label><UiText text="Meal component 2"/><input name="component2" maxLength={70} defaultValue={editing?.components[1] ?? ""} placeholder="e.g. egg curry" /></label>
            <label><UiText text="Meal component 3"/><input name="component3" maxLength={70} defaultValue={editing?.components[2] ?? ""} placeholder="e.g. seasonal vegetables" /></label>
          </div>
          <div className="workspace-form-row">
            <label><UiText text="Servings available"/><input name="servings" type="number" min="1" max="200" step="1" required defaultValue={editing?.servings ?? 10} /></label>
            <label><UiText text="Serving date"/><input name="serviceDate" type="date" min={localToday} required defaultValue={editing?.serviceDate ?? localToday} disabled={Boolean(editing)} /></label>
            <label><UiText text="Delivery time (India)"/><input name="deliveryTime" type="time" required defaultValue={editing?.deliveryTime ?? "12:30"} /></label>
          </div>
          <label><UiText text="Ingredients, separated by commas"/><input name="ingredients" maxLength={500} placeholder="rice, lentils, vegetables" /></label>
          <label><UiText text="Allergens, if any"/><input name="allergens" maxLength={300} placeholder="dairy, nuts, gluten" /></label>
          <div className="workspace-form-actions"><button className="button button-warm" type="submit" disabled={busyId === "menu"}><UiText text={busyId === "menu" ? "Saving…" : editing ? "Save changes" : "Save meal"}/></button>{editing && <button className="button button-quiet" type="button" onClick={() => setEditing(null)}><UiText text="Cancel edit"/></button>}</div>
        </form>
      </article>


    </section>

    <section className="dashboard-card mother-menu-list">
      <div className="workspace-section-heading"><div><span className="eyebrow"><UiText text="Your kitchen"/></span><h2 id="scheduled-menu"><UiText text="Scheduled meals"/></h2></div><span className="customer-count">{workspace.menus.length}</span></div>
      {workspace.menus.length ? <div className="workspace-menu-list">{workspace.menus.map((item) => <article key={item.id}>
        <div><span className="meal-type-mark">{item.oneTimeOnly?"ONE-TIME SPECIAL":item.mealPeriod??"LUNCH"} · {item.tier} · <UiText text={item.category === "NON_VEGETARIAN" ? "NON-VEG" : "VEG"}/></span><strong>{item.name}</strong><small>{item.components.join(" · ")} · {dateLabel(item.serviceDate)} · {item.deliveryTime} · {item.servings} <UiText text="servings ·"/>{money(item.price, "INR")}</small></div>
        <span className={"customer-status " + (item.isPublished && item.isAvailable ? "customer-status-active" : "customer-status-pending")}><UiText text={item.isPublished && item.isAvailable ? "Live" : "Draft"}/></span>
        <div className="workspace-record-actions"><button type="button" onClick={() => setEditing(item)}><UiText text="Edit"/></button><button type="button" onClick={() => removeMenu(item)} disabled={busyId === item.id}><UiText text="Remove"/></button></div>
      </article>)}</div> : <div className="customer-empty-state"><strong><UiText text="Your menu is empty"/></strong><span><UiText text="Add a meal and choose its date, servings and price to build the weekly menu."/></span></div>}
    </section>
  </div>;
}
