"use client";

import { useState } from "react";

type Role = "customer" | "mother" | "courier" | "admin";
const roleNames: Record<Role, string> = { customer: "Customer", mother: "Mother", courier: "Courier", admin: "Admin" };
const sampleMeals = [
  { id: "dalma", name: "Dalma comfort meal", cuisine: "Odia · Vegetarian", mother: "Ananya’s Home Kitchen", distance: "1.8 km", rating: "4.9", price: 69, icon: "🥣", tag: "BESTSELLER" },
  { id: "egg", name: "Egg curry lunch box", cuisine: "Home-style · Non-veg", mother: "Sabita’s Rasoi", distance: "2.6 km", rating: "4.8", price: 79, icon: "🍱", tag: "FRESH TODAY" },
  { id: "chicken", name: "Chicken curry meal", cuisine: "North Indian · Non-veg", mother: "Meera’s Kitchen", distance: "3.1 km", rating: "4.7", price: 99, icon: "🍛", tag: "ONLY 4 LEFT" },
];
const demoMenuSeed = [
  { day: "MON", meal: "Dalma, rice & greens", price: 69, veg: true },
  { day: "TUE", meal: "Egg curry lunch box", price: 79, veg: false },
  { day: "WED", meal: "Seasonal cheese thali", price: 89, veg: true },
];
const courierSteps = ["Accepted", "Heading to kitchen", "Picked up", "On the way", "Delivered"];

export function AppDemo() {
  const [role, setRole] = useState<Role>("customer");
  const [tab, setTab] = useState("Discover");
  const [cart, setCart] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(demoMenuSeed);
  const [deliveryStep, setDeliveryStep] = useState(2);
  const [search, setSearch] = useState("Bhubaneswar");

  function chooseRole(nextRole: Role) {
    setRole(nextRole);
    setTab(nextRole === "customer" ? "Discover" : nextRole === "mother" ? "Menu" : nextRole === "courier" ? "Jobs" : "Overview");
    setToast("");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  const cartTotal = cart.reduce((total, id) => total + (sampleMeals.find((meal) => meal.id === id)?.price ?? 0), 0);
  const tabs: Record<Role, string[]> = { customer: ["Discover", "Orders", "Wallet"], mother: ["Today", "Menu", "Earnings"], courier: ["Jobs", "Route", "Earnings"], admin: ["Overview", "Orders", "Income"] };

  return <section className="app-demo-preview" aria-label="Interactive Pausstik mobile app preview">
    <div className="app-demo-role-tabs" role="tablist" aria-label="Preview role">
      {(Object.keys(roleNames) as Role[]).map((item) => <button type="button" role="tab" aria-selected={role === item} className={role === item ? "is-active" : ""} key={item} onClick={() => chooseRole(item)}>{roleNames[item]}</button>)}
    </div>
    <div className="phone-shell">
      <div className="phone-screen">
        <div className="phone-status"><span>9:41</span><span aria-hidden="true">● ● ▰</span></div>
        <header className="phone-app-header">
          <div className="phone-app-brand"><span className="phone-brand-mark" aria-hidden="true">♨</span><div><strong>Pausstik</strong><small>{roleNames[role]} workspace</small></div></div>
          <button type="button" className="phone-avatar" aria-label="Profile menu" onClick={() => showToast("Profile settings open after sign in.")}>{role === "customer" ? "A" : role === "mother" ? "S" : role === "courier" ? "R" : "P"}</button>
        </header>
        <div className="phone-content">
          <div className="phone-preview-disclaimer"><span aria-hidden="true">✦</span> Sample preview <span>·</span> No live orders or payments</div>
          {role === "customer" && <CustomerPreview tab={tab} search={search} setSearch={setSearch} cart={cart} setCart={setCart} cartTotal={cartTotal} showToast={showToast} />}
          {role === "mother" && <MotherPreview tab={tab} menu={menu} setMenu={setMenu} showToast={showToast} />}
          {role === "courier" && <CourierPreview tab={tab} deliveryStep={deliveryStep} setDeliveryStep={setDeliveryStep} showToast={showToast} />}
          {role === "admin" && <AdminPreview tab={tab} showToast={showToast} />}
          {toast && <div className="phone-toast" role="status">{toast}</div>}
        </div>
        <nav className="phone-bottom-nav" aria-label={`${roleNames[role]} sample navigation`}>
          {tabs[role].map((item, index) => <button type="button" key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}><span aria-hidden="true">{role === "customer" ? ["⌖", "▤", "₹"][index] : role === "mother" ? ["⌂", "☷", "₹"][index] : role === "courier" ? ["▣", "↗", "₹"][index] : ["▦", "▤", "₹"][index]}</span>{item}</button>)}
          <a href="/" aria-label="Go to Pausstik website"><span aria-hidden="true">⌂</span>Website</a>
        </nav>
      </div>
    </div>
    <p className="phone-caption">Designed for one hand, clear choices and quick updates.</p>
  </section>;
}

function CustomerPreview({ tab, search, setSearch, cart, setCart, cartTotal, showToast }: { tab: string; search: string; setSearch: (value: string) => void; cart: string[]; setCart: (value: string[] | ((items: string[]) => string[])) => void; cartTotal: number; showToast: (message: string) => void }) {
  const [filter, setFilter] = useState("All");
  if (tab === "Orders") return <div className="phone-view"><span className="phone-eyebrow">YOUR TABLE</span><h2>Your orders</h2><div className="phone-order-card"><div className="phone-order-top"><strong>#PSK-DEMO-2048</strong><span className="phone-status-chip">On the way</span></div><p>Dalma comfort meal · Ananya’s Home Kitchen</p><div className="phone-delivery-progress"><i className="done"/><i className="done"/><i className="current"/><i/><i/></div><small>Courier Raj is nearby · Sample tracking</small><button className="phone-secondary-action" type="button" onClick={() => showToast("This is a sample order. Sign in to see your live tracking.")}>View delivery updates <span>→</span></button></div><div className="phone-empty-tip"><b>Delivery, made visible</b><span>When live, follow kitchen prep, pickup and courier updates right here.</span></div></div>;
  if (tab === "Wallet") return <div className="phone-view"><span className="phone-eyebrow">YOUR PAUSSTIK WALLET</span><h2>Meal credits, clearly shown.</h2><div className="phone-wallet-card"><small>AVAILABLE BALANCE</small><strong>₹120</strong><span>Sample wallet credit</span></div><div className="phone-ledger-row"><span><b>Skipped meal · Tue</b><small>Returned after ₹5 service fee</small></span><strong>+₹64</strong></div><div className="phone-ledger-row"><span><b>Order · Mon</b><small>Dalma comfort meal</small></span><strong className="debit">−₹69</strong></div><p className="phone-hint">Your live wallet appears after sign in.</p></div>;
  return <div className="phone-view"><span className="phone-eyebrow">GOOD AFTERNOON, ASHISH</span><h2>What sounds good today?</h2><label className="phone-location-search"><span aria-hidden="true">⌖</span><input aria-label="Delivery area" value={search} onChange={(event) => setSearch(event.target.value)} /><span>⌄</span></label><div className="phone-nearby-row"><div><strong>Mother-led kitchens near you</strong><small>Within 5–10 km · {search || "Choose an area"}</small></div><button type="button" onClick={() => showToast("Location permission can be enabled after you sign in.")}>Change</button></div><div className="phone-filter-row">{["All", "Veg", "Non-veg"].map((item) => <button className={filter === item ? "is-active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="phone-meal-list">{sampleMeals.filter((meal) => filter === "All" || (filter === "Veg" ? meal.id === "dalma" : meal.id !== "dalma")).map((meal) => <article className="phone-meal-card" key={meal.id}><div className={`phone-meal-art meal-${meal.id}`}><span>{meal.icon}</span><small>{meal.tag}</small></div><div className="phone-meal-details"><div className="phone-rating">★ {meal.rating} <span>·</span> {meal.distance} away</div><strong>{meal.name}</strong><small>{meal.mother}</small><span className="phone-meal-subtitle">{meal.cuisine}</span><div className="phone-meal-footer"><b>₹{meal.price}<small> / meal</small></b><button type="button" aria-label={`Add ${meal.name} to sample basket`} onClick={() => { if (cart.includes(meal.id)) showToast(`${meal.name} is already in your sample basket.`); else { setCart((items) => [...items, meal.id]); showToast(`${meal.name} added to sample basket.`); } }}>{cart.includes(meal.id) ? "Added ✓" : "Add +"}</button></div></div></article>)}</div>{cart.length > 0 && <button className="phone-cart-bar" type="button" onClick={() => showToast(`${cart.length} sample item${cart.length === 1 ? "" : "s"} · ₹${cartTotal} + delivery. Sign in to place a live order.`)}><span>{cart.length} {cart.length === 1 ? "meal" : "meals"} in basket</span><strong>₹{cartTotal} <i>View basket →</i></strong></button>}<p className="phone-hint">Prices are examples. ₹30 delivery per order.</p></div>;
}

function MotherPreview({ tab, menu, setMenu, showToast }: { tab: string; menu: typeof demoMenuSeed; setMenu: (value: typeof demoMenuSeed | ((items: typeof demoMenuSeed) => typeof demoMenuSeed)) => void; showToast: (message: string) => void }) {
  const [mealName, setMealName] = useState("");
  if (tab === "Earnings") return <div className="phone-view"><span className="phone-eyebrow">THIS WEEK</span><h2>Your kitchen is growing.</h2><div className="phone-wallet-card mother-wallet"><small>RECORDED EARNINGS</small><strong>₹3,420</strong><span>Demo figures · payouts aren’t active</span></div><div className="phone-mini-stats"><span><b>18</b><small>meals sold</small></span><span><b>4.9 ★</b><small>customer rating</small></span></div><div className="phone-empty-tip"><b>Keep your menu fresh</b><span>Published meals from your kitchen are shown to nearby customers.</span></div></div>;
  if (tab === "Today") return <div className="phone-view"><span className="phone-eyebrow">TUESDAY · KITCHEN BOARD</span><h2>Good morning, Sunita.</h2><div className="phone-kitchen-health"><span className="green-pulse"/><div><strong>Your kitchen is ready</strong><small>Approved · Serving within 8 km</small></div><span className="verified-mini">✓ Verified</span></div><div className="phone-count-card"><div><small>ORDERS TO PREPARE</small><strong>6 meals</strong></div><span>Pickup at 12:15<br/>by courier</span></div><button type="button" className="phone-main-action" onClick={() => showToast("Sample order queue opened. Sign in to manage real kitchen orders.")}>Open today’s orders <span>→</span></button><div className="phone-empty-tip"><b>Next up</b><span>Keep today’s menu availability and serving count up to date.</span></div></div>;
  return <div className="phone-view"><span className="phone-eyebrow">YOUR WEEKLY MENU</span><h2>Plan meals your way.</h2><div className="phone-menu-owner"><span className="mother-avatar">S</span><div><strong>Sunita’s Home Kitchen</strong><small>Verified · 4.9 ★ · 1.8 km</small></div><button type="button" aria-label="Kitchen settings" onClick={() => showToast("Kitchen details can be updated in your live workspace.")}>•••</button></div><div className="phone-menu-rows">{menu.map((item, index) => <div className="phone-menu-row" key={`${item.day}-${index}`}><span className="menu-day">{item.day}</span><span className={item.veg ? "veg-dot" : "nonveg-dot"} aria-label={item.veg ? "Vegetarian" : "Non-vegetarian"}/><span className="menu-meal-name">{item.meal}<small>3 items · {item.veg ? "Veg" : "Non-veg"}</small></span><strong>₹{item.price}</strong></div>)}</div><form className="phone-add-menu" onSubmit={(event) => { event.preventDefault(); if (!mealName.trim()) return; setMenu((items) => [...items, { day: "THU", meal: mealName.trim(), price: 69, veg: true }]); setMealName(""); showToast("Meal added to the sample weekly menu."); }}><label htmlFor="sample-meal-name">Add a Thursday meal</label><div><input id="sample-meal-name" value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="e.g. Veg pulao & raita" maxLength={60}/><button type="submit" disabled={!mealName.trim()}>Add</button></div></form><p className="phone-hint">Sample menu changes stay in this preview.</p></div>;
}

function CourierPreview({ tab, deliveryStep, setDeliveryStep, showToast }: { tab: string; deliveryStep: number; setDeliveryStep: (value: number | ((step: number) => number)) => void; showToast: (message: string) => void }) {
  if (tab === "Earnings") return <div className="phone-view"><span className="phone-eyebrow">THIS WEEK</span><h2>Your deliveries add up.</h2><div className="phone-wallet-card courier-wallet"><small>DEMO EARNINGS</small><strong>₹1,140</strong><span>12 deliveries · Sample data</span></div><div className="phone-ledger-row"><span><b>Today · 4 completed</b><small>₹35 average per delivery</small></span><strong>₹140</strong></div><p className="phone-hint">Live earnings and payout details show after you sign in.</p></div>;
  if (tab === "Route") return <div className="phone-view"><span className="phone-eyebrow">DELIVERY TRACKING</span><h2>Every handover, in view.</h2><div className="phone-map-card"><div className="map-roads"/><span className="map-pin kitchen-pin">⌂</span><span className="map-pin courier-pin">➤</span><span className="map-pin customer-pin">⌖</span><div className="map-legend"><b>Order PSK-DEMO-2048</b><small>Raj is 1.2 km away · sample route</small></div></div><div className="phone-route-list"><span className="route-done">✓ Order accepted</span><span className="route-done">✓ Picked up from Sunita</span><span className="route-now">● On the way to Ashish</span><span>○ Delivered</span></div><button className="phone-secondary-action" type="button" onClick={() => showToast("Live route and GPS updates appear after a courier accepts an order.")}>Location sharing settings <span>→</span></button></div>;
  const current = courierSteps[deliveryStep];
  return <div className="phone-view"><span className="phone-eyebrow">READY NEARBY · PATIA</span><h2>One more meal on its way.</h2><article className="phone-job-card"><div className="phone-order-top"><span className="job-icon">♨</span><span className="phone-status-chip">{current}</span></div><strong>Lunch order · PSK-DEMO-2048</strong><p>Sunita’s kitchen <span>→</span> Ashish · 2.4 km</p><div className="phone-pickup-detail"><span>⌂</span><div><b>Pickup · Sunita’s kitchen</b><small>Patia main road · pickup pin saved</small></div></div><div className="phone-pickup-detail"><span>⌖</span><div><b>Drop-off · Ashish</b><small>Saheed Nagar · customer pin saved</small></div></div><button className="phone-main-action" type="button" onClick={() => { if (deliveryStep < courierSteps.length - 1) setDeliveryStep((step) => step + 1); else setDeliveryStep(0); showToast(deliveryStep === courierSteps.length - 1 ? "Sample route restarted." : `Sample delivery updated: ${courierSteps[deliveryStep + 1]}.`); }}>{deliveryStep < courierSteps.length - 1 ? `Update: ${courierSteps[deliveryStep + 1]}` : "Restart sample delivery"} <span>→</span></button></article><div className="phone-gps-note"><span>⌖</span><p><b>GPS is your choice</b><small>Live location is shared only during an active delivery.</small></p></div></div>;
}

function AdminPreview({ tab, showToast }: { tab: string; showToast: (message: string) => void }) {
  if (tab === "Orders") return <div className="phone-view"><span className="phone-eyebrow">LIVE OPERATIONS · EXAMPLE DATA</span><h2>Order activity</h2><div className="phone-admin-order"><div><strong>#PSK-2048</strong><span className="phone-status-chip">On the way</span></div><p>Dalma lunch · Sunita’s kitchen · ₹99</p><small>Courier Raj · updated 2 min ago</small></div><div className="phone-admin-order"><div><strong>#PSK-2047</strong><span className="delivered-chip">Delivered</span></div><p>Egg lunch box · Sabita’s Rasoi · ₹109</p><small>Courier Meera · today at 12:38</small></div><button className="phone-secondary-action" type="button" onClick={() => showToast("Detailed order controls are available after admin sign in.")}>Open order controls <span>→</span></button></div>;
  if (tab === "Income") return <div className="phone-view"><span className="phone-eyebrow">FINANCE · THIS WEEK</span><h2>Every rupee accounted for.</h2><div className="phone-admin-income"><small>RECORDED COLLECTIONS</small><strong>₹24,860</strong><span>Illustrative sample figures</span><div><i style={{ height: "46%" }}/><i style={{ height: "65%" }}/><i style={{ height: "56%" }}/><i style={{ height: "86%" }}/><i style={{ height: "67%" }}/><i style={{ height: "100%" }}/><i style={{ height: "75%" }}/></div><small>MON <span>WEEKLY TREND</span> SUN</small></div><div className="phone-ledger-row"><span><b>Mother earnings</b><small>Awaiting payout</small></span><strong>₹18,240</strong></div><div className="phone-ledger-row"><span><b>Courier earnings</b><small>Awaiting payout</small></span><strong>₹4,200</strong></div><p className="phone-hint">These numbers are examples only, never your live financial data.</p></div>;
  return <div className="phone-view"><span className="phone-eyebrow">PAUSSTIK OPERATIONS</span><h2>Good morning, admin.</h2><div className="phone-admin-stats"><article><span>Accounts</span><b>128</b><small>All roles</small></article><article><span>Orders today</span><b>36</b><small>8 in progress</small></article><article><span>Partners</span><b>24</b><small>3 to review</small></article><article><span>Deliveries</span><b>31</b><small>5 on the road</small></article></div><div className="phone-activity-card"><div><b>Recent activity</b><button type="button" onClick={() => showToast("All live activity is in your admin dashboard.")}>View all</button></div><p><i/>New mother application<small>Sunita Das · 8 min ago</small></p><p><i/>Order picked up<small>PSK-2048 · 12 min ago</small></p><p><i/>Delivery completed<small>PSK-2042 · 24 min ago</small></p></div><p className="phone-hint">Demo activity only. Sign in as admin for live records.</p></div>;
}
