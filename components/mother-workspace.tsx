"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type MenuItem = { id: string; mealId: string; name: string; description: string | null; category: string; tier: string; components: string[]; deliveryTime: string; price: number; serviceDate: string; servings: number; isAvailable: boolean; isPublished: boolean };
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
  const [marketplaceRadiusKm, setMarketplaceRadiusKm] = useState(8);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/mother/menu", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your kitchen workspace.");
      setWorkspace(data);
      setMarketplaceRadiusKm(data.kitchen.marketplaceRadiusKm || 8);
      setProblem("");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not load your kitchen workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
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
      tier: String(form.get("tier") || "BASE"),
      components: [String(form.get("component1") || ""), String(form.get("component2") || ""), String(form.get("component3") || "")],
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
    setMessage("Pausstik uses your kitchen pin to check courier arrival. It is shared with the assigned courier for orders.");
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
  const minimumPrice = editing?.tier === "EGG" ? 79 : editing?.tier === "CHEESE" ? 89 : editing?.tier === "CHICKEN" ? 99 : 69;
  const maximumPrice = editing?.tier === "CHICKEN" ? 100 : 500;
  if (loading) return <div className="dashboard-banner">Loading your kitchen workspace…</div>;
  if (!workspace) return <div className="dashboard-banner admin-warning">{problem || "Your kitchen workspace could not load."}</div>;

  return <div className="mother-workspace">
    <section className="mother-summary-grid" id="kitchen-summary" aria-label="Kitchen status">
      <article><span>Kitchen</span><strong>{workspace.kitchen.name}</strong><small>{workspace.kitchen.approved ? "Pausstik verified" : "Waiting for Pausstik approval"}</small></article>
      <article><span>Menu items</span><strong>{workspace.menus.filter((item) => item.isPublished && item.isAvailable).length}</strong><small>Live and available to customers</small></article>
      <article><span>Recorded earnings</span><strong>{money(workspace.earningsRecorded, workspace.currency)}</strong><small>Recorded after payment; payouts are not connected</small></article>
    </section>

    <section className="mother-location-panel">
      <div><span className="eyebrow">Kitchen location</span><h2>{workspace.kitchen.hasLocation ? "Kitchen pin saved" : "Add your kitchen pickup pin"}</h2><p>Choose a customer service radius from 5–10 km. Couriers still use the separate 150 m pickup geofence at this pin.</p><label className="mother-radius-setting">Customer delivery area<select value={marketplaceRadiusKm} onChange={(event) => setMarketplaceRadiusKm(Number(event.target.value))}>{[5,6,7,8,9,10].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></label></div>
      <button className="button button-small" type="button" onClick={pinKitchen} disabled={busyId === "location"}>{busyId === "location" ? "Waiting for GPS…" : workspace.kitchen.hasLocation ? "Refresh kitchen pin" : "Use this device location"}</button>
    </section>

    {message && <p className="workspace-message" role="status">{message}</p>}
    {problem && <p className="workspace-message is-error" role="alert">{problem}</p>}

    <section className="mother-work-grid" id="mother-orders">
      <article className="dashboard-card mother-menu-editor">
        <div className="workspace-section-heading"><div><span className="eyebrow">Weekly menu</span><h2 id="weekly-menu">{editing ? "Update meal" : "Add a meal"}</h2></div><button className="button button-quiet" type="button" onClick={publishDrafts} disabled={busyId === "publish" || !workspace.kitchen.approved || !workspace.kitchen.hasLocation}>{busyId === "publish" ? "Publishing…" : "Publish menu"}</button></div>
        {!workspace.kitchen.approved && <p className="mother-gate-note">Pausstik must approve your kitchen before customers can order. You can save meal drafts now.</p>}
        {workspace.kitchen.approved && !workspace.kitchen.hasLocation && <p className="mother-gate-note">Set your pickup pin before menu publishing. Pickup geofencing needs this verified location.</p>}
        <form className="workspace-form" key={editing?.id || "new-meal"} onSubmit={saveMenu}>
          <label>Meal name<input name="name" required minLength={3} maxLength={90} defaultValue={editing?.name ?? ""} placeholder="e.g. Dalma, rice and seasonal sides" /></label>
          <label>Description<input name="description" maxLength={400} defaultValue={editing?.description ?? ""} placeholder="What comes in the lunch box?" /></label>
          <div className="workspace-form-row">
            <label>Meal tier<select name="tier" defaultValue={editing?.tier ?? "BASE"} onChange={(event) => { const price = event.currentTarget.form?.elements.namedItem("price") as HTMLInputElement | null; const limits = ({ BASE: { min: 69, max: 500 }, EGG: { min: 79, max: 500 }, CHEESE: { min: 89, max: 500 }, CHICKEN: { min: 99, max: 100 } } as Record<string, { min: number; max: number }>)[event.currentTarget.value] || { min: 69, max: 500 }; if (price) { price.min = String(limits.min); price.max = String(limits.max); price.value = String(limits.min); } }}><option value="BASE">Base meal · from ₹69</option><option value="EGG">Egg meal · from ₹79</option><option value="CHEESE">Cheese meal · from ₹89</option><option value="CHICKEN">Chicken meal · ₹99–₹100</option></select></label>
            <label>Price (₹)<input name="price" type="number" min={minimumPrice} max={maximumPrice} step="1" required defaultValue={editing?.price ?? 69} /><small>Starting prices are ₹69 / ₹79 / ₹89 / ₹99. Chicken is capped at ₹100.</small></label>
          </div>
          <div className="workspace-form-row">
            <label>Meal component 1<input name="component1" required maxLength={70} defaultValue={editing?.components[0] ?? ""} placeholder="e.g. rice" /></label>
            <label>Meal component 2<input name="component2" required maxLength={70} defaultValue={editing?.components[1] ?? ""} placeholder="e.g. egg curry" /></label>
            <label>Meal component 3<input name="component3" required maxLength={70} defaultValue={editing?.components[2] ?? ""} placeholder="e.g. seasonal vegetables" /></label>
          </div>
          <div className="workspace-form-row">
            <label>Servings available<input name="servings" type="number" min="1" max="200" step="1" required defaultValue={editing?.servings ?? 10} /></label>
            <label>Serving date<input name="serviceDate" type="date" min={localToday} required defaultValue={editing?.serviceDate ?? localToday} disabled={Boolean(editing)} /></label>
            <label>Delivery time (India)<input name="deliveryTime" type="time" required defaultValue={editing?.deliveryTime ?? "12:30"} /></label>
          </div>
          <label>Ingredients, separated by commas<input name="ingredients" maxLength={500} placeholder="rice, lentils, vegetables" /></label>
          <label>Allergens, if any<input name="allergens" maxLength={300} placeholder="dairy, nuts, gluten" /></label>
          <div className="workspace-form-actions"><button className="button button-warm" type="submit" disabled={busyId === "menu"}>{busyId === "menu" ? "Saving…" : editing ? "Save changes" : "Save meal"}</button>{editing && <button className="button button-quiet" type="button" onClick={() => setEditing(null)}>Cancel edit</button>}</div>
        </form>
      </article>

      <article className="dashboard-card mother-orders-panel">
        <div className="workspace-section-heading"><div><span className="eyebrow">Kitchen queue</span><h2 id="incoming-orders">Incoming orders</h2></div><span className="customer-count">{workspace.orders.length}</span></div>
        {workspace.orders.length ? <div className="workspace-record-list">{workspace.orders.map((order) => <article key={order.id}>
          <div className="workspace-record-head"><strong>{order.orderNumber}</strong><span className={"customer-status customer-status-" + order.status.toLowerCase()}>{order.status.toLowerCase().replaceAll("_", " ")}</span></div>
          <p>{order.customer} · {order.items.join(", ")}</p><small>For {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(order.scheduledFor))} · {money(order.total, "INR")}</small>
          <div className="workspace-record-actions">
            {order.status === "ORDER_PLACED" && <><button type="button" onClick={() => updateOrder(order, "CONFIRMED")} disabled={busyId === order.id}>Accept order</button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}>Decline</button></>}
            {order.status === "CONFIRMED" && <><button type="button" onClick={() => updateOrder(order, "PREPARING")} disabled={busyId === order.id}>Start cooking</button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}>Cancel</button></>}
            {order.status === "PREPARING" && <><button type="button" onClick={() => updateOrder(order, "READY_FOR_PICKUP")} disabled={busyId === order.id}>Ready for courier</button><button type="button" onClick={() => updateOrder(order, "CANCELLED")} disabled={busyId === order.id}>Cancel</button></>}
            {order.status === "READY_FOR_PICKUP" && <span>Waiting for an approved courier to claim.</span>}
            {order.status === "DELIVERY_ASSIGNED" && <span>Courier accepted this delivery.</span>}
            {order.status === "PICKED_UP" && <span>Courier picked up this order.</span>}
            {order.status === "OUT_FOR_DELIVERY" && <span>Courier is on the way to the customer.</span>}
          </div>
        </article>)}</div> : <div className="customer-empty-state"><strong>No open orders yet</strong><span>New customer orders will appear here for you to accept and prepare.</span></div>}
      </article>
    </section>

    <section className="dashboard-card mother-menu-list">
      <div className="workspace-section-heading"><div><span className="eyebrow">Your kitchen</span><h2 id="scheduled-menu">Scheduled meals</h2></div><span className="customer-count">{workspace.menus.length}</span></div>
      {workspace.menus.length ? <div className="workspace-menu-list">{workspace.menus.map((item) => <article key={item.id}>
        <div><span className="meal-type-mark">{item.tier} · {item.category === "NON_VEGETARIAN" ? "NON-VEG" : "VEG"}</span><strong>{item.name}</strong><small>{item.components.join(" · ")} · {dateLabel(item.serviceDate)} · {item.deliveryTime} · {item.servings} servings · {money(item.price, "INR")}</small></div>
        <span className={"customer-status " + (item.isPublished && item.isAvailable ? "customer-status-active" : "customer-status-pending")}>{item.isPublished && item.isAvailable ? "Live" : "Draft"}</span>
        <div className="workspace-record-actions"><button type="button" onClick={() => setEditing(item)}>Edit</button><button type="button" onClick={() => removeMenu(item)} disabled={busyId === item.id}>Remove</button></div>
      </article>)}</div> : <div className="customer-empty-state"><strong>Your menu is empty</strong><span>Add a meal and choose its date, servings and price to build the weekly menu.</span></div>}
    </section>
    <p className="dashboard-banner">Pausstik records orders and partner earnings. Online payments and bank payouts are not connected yet; this workspace never stores bank details.</p>
  </div>;
}
