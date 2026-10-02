import Link from "next/link";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CancelOrderButton, CustomerDeliveryPin, CustomerDeliveryTracking, CustomerWallet, FavoriteKitchenButton, PlaceOrderButton, WeeklyPlanPicker } from "@/components/customer-marketplace-controls";
import { distanceMeters, mealPriceAllowed } from "@/lib/marketplace-rules";

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(value);
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency.trim(), maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency.trim()} ${value.toFixed(0)}`;
  }
}

function title(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type KitchenCard = {
  id: string;
  name: string;
  motherName: string;
  locality: string;
  city: string;
  cuisine: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  marketplaceRadiusKm?: number;
  isFavorite?: boolean;
  meals: { id: string; menuId?: string; name: string; category: string; tier: string; components: string[]; price: number; serviceDate?: string; deliveryTime?: string; servings: number }[];
};

const sampleKitchens: KitchenCard[] = [
  { id: "sample-ananya", name: "Ananya's Home Kitchen", motherName: "Ananya", locality: "Patia", city: "Bhubaneswar", cuisine: "Odia · Vegetarian", rating: 4.9, meals: [{ id: "sample-dal", name: "Dalma lunch box", category: "VEGETARIAN", tier: "BASE", components: ["Rice", "Dalma", "Seasonal greens"], price: 69, servings: 8 }, { id: "sample-khichdi", name: "Egg khichdi lunch", category: "NON_VEGETARIAN", tier: "EGG", components: ["Rice", "Egg", "Seasonal vegetables"], price: 79, servings: 8 }] },
  { id: "sample-sabita", name: "Sabita's Rasoi", motherName: "Sabita", locality: "Sailashree Vihar", city: "Bhubaneswar", cuisine: "Odia · Home-style", rating: 4.8, meals: [{ id: "sample-thali", name: "Seasonal cheese meal", category: "VEGETARIAN", tier: "CHEESE", components: ["Rice", "Cheese curry", "Seasonal vegetables"], price: 89, servings: 8 }, { id: "sample-chicken", name: "Chicken curry lunch", category: "NON_VEGETARIAN", tier: "CHICKEN", components: ["Rice", "Chicken curry", "Seasonal vegetables"], price: 99, servings: 8 }] },
  { id: "sample-meera", name: "Meera's Neighbourhood Kitchen", motherName: "Meera", locality: "Chandrasekharpur", city: "Bhubaneswar", cuisine: "North Indian · Vegetarian & non-vegetarian", rating: 4.7, meals: [{ id: "sample-paneer", name: "Cheese meal box", category: "VEGETARIAN", tier: "CHEESE", components: ["Rice", "Cheese curry", "Salad"], price: 89, servings: 8 }, { id: "sample-egg", name: "Egg curry meal box", category: "NON_VEGETARIAN", tier: "EGG", components: ["Rice", "Egg curry", "Seasonal vegetables"], price: 79, servings: 8 }] },
];

async function loadCustomerActivity(customerId: string) {
  return Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { orderedAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        orderedAt: true,
        scheduledFor: true,
        totalAmount: true,
        currency: true,
        kitchen: { select: { name: true } },
        items: { select: { mealName: true, quantity: true } },
        delivery: { select: { status: true } },
      },
    }),
    prisma.subscription.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        nextRenewalAt: true,
        mealPlan: { select: { name: true, cadence: true, mealCount: true, price: true, currency: true } },
      },
    }),
  ]);
}

async function loadNearbyKitchens(city?: string, customerPin?: { latitude: number; longitude: number }, favoriteKitchenIds: Set<string> = new Set()): Promise<KitchenCard[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const kitchens = await prisma.kitchen.findMany({
    where: {
      verificationStatus: "APPROVED", isAcceptingOrders: true,
      ...(city && !customerPin ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      menus: { some: { isAvailable: true, serviceDate: { gte: today, lt: weekEnd }, cycle: { status: "PUBLISHED" }, meal: { isAvailable: true } } },
    },
    orderBy: [{ mother: { rating: "desc" } }, { name: "asc" }],
    take: 8,
    select: {
      id: true, name: true, locality: true, city: true, cuisine: true, latitude: true, longitude: true, marketplaceRadiusMeters: true,
      mother: { select: { rating: true, user: { select: { name: true, status: true } } } },
      menus: {
        where: { isAvailable: true, serviceDate: { gte: today, lt: weekEnd }, cycle: { status: "PUBLISHED" }, meal: { isAvailable: true } },
        orderBy: [{ serviceDate: "asc" }, { meal: { name: "asc" } }], take: 12,
        select: { id: true, serviceDate: true, deliveryTime: true, stockCount: true, meal: { select: { id: true, name: true, category: true, tier: true, components: true, price: true } } },
      },
    },
  });
  return kitchens
    .filter((kitchen) => kitchen.mother.user.status === "ACTIVE" && kitchen.latitude !== null && kitchen.longitude !== null && kitchen.menus.some((menu) => menu.meal.components.length === 3 && mealPriceAllowed(menu.meal.tier, Number(menu.meal.price))))
    .map((kitchen) => {
      const distanceKm = customerPin && kitchen.latitude !== null && kitchen.longitude !== null
        ? distanceMeters(customerPin, { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }) / 1000
        : undefined;
      return ({
      id: kitchen.id,
      name: kitchen.name,
      motherName: kitchen.mother.user.name,
      locality: kitchen.locality,
      city: kitchen.city,
      cuisine: kitchen.cuisine,
      rating: Number(kitchen.mother.rating),
      isFavorite: favoriteKitchenIds.has(kitchen.id),
      latitude: Number(kitchen.latitude),
      longitude: Number(kitchen.longitude),
      distanceKm,
      marketplaceRadiusKm: kitchen.marketplaceRadiusMeters / 1000,
      meals: kitchen.menus.filter((menu) => menu.meal.components.length === 3 && mealPriceAllowed(menu.meal.tier, Number(menu.meal.price))).map((menu) => ({ menuId: menu.id, id: menu.meal.id, name: menu.meal.name, category: menu.meal.category, tier: menu.meal.tier, components: menu.meal.components, price: Number(menu.meal.price), serviceDate: menu.serviceDate.toISOString().slice(0, 10), deliveryTime: menu.deliveryTime, servings: menu.stockCount })),
    }); })
    .filter((kitchen) => kitchen.distanceKm === undefined || kitchen.distanceKm <= (kitchen.marketplaceRadiusKm ?? 8))
    .sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) || (a.distanceKm !== undefined && b.distanceKm !== undefined ? a.distanceKm - b.distanceKm : b.rating - a.rating));
}

export default async function CustomerDashboardPage() {
  const user = await requireRole("CUSTOMER");
  type CustomerActivity = Awaited<ReturnType<typeof loadCustomerActivity>>;
  let orders: CustomerActivity[0] = [];
  let subscriptions: CustomerActivity[1] = [];
  let activityAvailable = true;
  let kitchens: KitchenCard[] = [];
  let deliveryCity: string | undefined;
  let hasDeliveryPin = false;
  let customerPin: { latitude: number; longitude: number } | undefined;

  if (!isLocalAuthMode()) {
    try {
      [orders, subscriptions] = await loadCustomerActivity(user.id);
    } catch (error) {
      activityAvailable = false;
      console.error("Pausstik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
    try {
      const address = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { city: true, latitude: true, longitude: true } });
      const savedKitchens = await prisma.favoriteKitchen.findMany({ where: { customerId: user.id }, select: { kitchenId: true } });
      deliveryCity = address?.city;
      hasDeliveryPin = address?.latitude !== null && address?.latitude !== undefined && address?.longitude !== null && address?.longitude !== undefined;
      if (hasDeliveryPin && address?.latitude !== null && address?.latitude !== undefined && address?.longitude !== null && address?.longitude !== undefined) customerPin = { latitude: Number(address.latitude), longitude: Number(address.longitude) };
      kitchens = await loadNearbyKitchens(deliveryCity, customerPin, new Set(savedKitchens.map((favorite) => favorite.kitchenId)));
    } catch (error) {
      console.error("Pausstik kitchen discovery could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
  }
  const listingsAreSamples = kitchens.length === 0;
  const visibleKitchens = listingsAreSamples ? sampleKitchens : kitchens;

  const activePlans = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const paidOrderCount = orders.length;

  return <main className="dashboard-shell customer-dashboard">
    <div className="dashboard-head customer-dashboard-head">
      <div><span className="eyebrow">Your Pausstik table</span><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>Find a nearby mother, choose the meals you like and reserve at least three days with her for the week.</p></div>
      <Link className="button button-warm customer-menu-cta" href="#nearby-kitchens-title">Find nearby meals <span aria-hidden="true">→</span></Link>
    </div>

    <section className="customer-stats" aria-label="Your account activity">
      <article className="customer-stat"><span>Orders</span><strong>{paidOrderCount}</strong><small>Saved to your Pausstik account</small></article>
      <article className="customer-stat"><span>Active meal plans</span><strong>{activePlans}</strong><small>Plans with an active status</small></article>
      <article className="customer-stat"><span>Account</span><strong className="customer-stat-active">Active</strong><small>Signed in as a customer</small></article>
    </section>

    <CustomerDeliveryPin initialPinned={hasDeliveryPin} />
    <CustomerWallet />

    <section className="customer-discovery" id="customer-discover" aria-labelledby="nearby-kitchens-title">
      <div className="customer-panel-heading"><div><span className="eyebrow">From neighbourhood kitchens</span><h2 id="nearby-kitchens-title">Find your next lunch</h2></div><span className="customer-count">{visibleKitchens.length}</span></div>
      {listingsAreSamples && <p className="customer-demo-label">Sample kitchens and prices for the Bhubaneswar preview. Live listings appear here after kitchens are verified and menus are published.</p>}
      <div className="customer-kitchen-grid">{visibleKitchens.map((kitchen) => <article className="customer-kitchen-card" key={kitchen.id}>
        <div className="customer-kitchen-top"><span className="customer-kitchen-mark" aria-hidden="true">{kitchen.motherName.slice(0, 1)}</span><span className="customer-rating">★ {kitchen.rating.toFixed(1)}</span></div>
        <h3>{kitchen.name}</h3><p className="customer-kitchen-meta">{kitchen.locality}, {kitchen.city} · {kitchen.cuisine}</p>
        {kitchen.distanceKm !== undefined && <p className="customer-kitchen-distance">{kitchen.distanceKm.toFixed(1)} km away · kitchen serves up to {kitchen.marketplaceRadiusKm?.toFixed(0) ?? 8} km</p>}
        {kitchen.latitude !== undefined && kitchen.longitude !== undefined && <a className="customer-map-link" href={"https://www.openstreetmap.org/?mlat=" + kitchen.latitude + "&mlon=" + kitchen.longitude + "#map=15/" + kitchen.latitude + "/" + kitchen.longitude} target="_blank" rel="noreferrer">View kitchen on OpenStreetMap ↗</a>}
        <p className="customer-kitchen-mother">Prepared by {kitchen.motherName}</p>
        {!listingsAreSamples && <FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)} />}
        <ul className="customer-meal-list">{kitchen.meals.length ? kitchen.meals.map((meal) => <li key={meal.menuId ?? meal.id}>
          <span><small>{meal.tier} · {meal.category === "VEGETARIAN" ? "VEG" : "NON-VEG"}</small>{meal.name}<small className="customer-meal-date">{meal.components.join(" · ") || "Three-part meal"}{meal.serviceDate && " · " + new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(meal.serviceDate + "T00:00:00.000Z")) + " · " + (meal.deliveryTime || "12:30") + " · " + meal.servings + " left"}</small></span>
          <div><strong>{money(meal.price, "INR")}</strong>{meal.menuId && <PlaceOrderButton menuId={meal.menuId} servings={meal.servings} />}</div>
        </li>) : <li><span>Weekly menu is being prepared</span></li>}</ul>
        {listingsAreSamples ? <Link className="button button-small customer-kitchen-cta" href="/help#customer-workspace">See how to order <span aria-hidden="true">→</span></Link> : <><p className="customer-delivery-fee-note">₹30 delivery per day · online checkout is not connected; no payment is taken here.</p><WeeklyPlanPicker kitchenName={kitchen.name} menus={kitchen.meals.filter((meal) => Boolean(meal.menuId && meal.serviceDate)).map((meal) => ({ menuId: meal.menuId!, name: meal.name, serviceDate: meal.serviceDate!, price: meal.price, servings: meal.servings }))} /></>}
      </article>)}</div>
    </section>

    <section className="customer-activity-grid" id="order-history" aria-label="Your orders and meal plans">
      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Order history</span><h2>Recent orders</h2></div><span className="customer-count">{orders.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your account activity right now. Refresh this page in a moment.</p> : orders.length ? <ul className="customer-record-list">
          {orders.map((order) => <li key={order.id}>
            <div className="customer-record-main"><strong>{order.orderNumber}</strong><span>{order.kitchen.name} · {order.items.map((item) => `${item.quantity} × ${item.mealName}`).join(", ")}</span><small>Ordered {date(order.orderedAt)} · For {date(order.scheduledFor)}</small>{order.delivery && order.status !== "DELIVERED" && order.status !== "CANCELLED" && <CustomerDeliveryTracking orderId={order.id} orderNumber={order.orderNumber} />}</div>
            <div className="customer-record-meta"><b>{money(Number(order.totalAmount), order.currency)}</b><span className={`customer-status customer-status-${order.status.toLowerCase()}`}>{title(order.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">⌑</span><strong>Your first order will show up here</strong><span>Browse the sample menu to see how the meal selection works. Sample orders stay in the preview and are not sent to a kitchen.</span><Link className="text-link" href="/legacy-demo.html">Open sample menu <span aria-hidden="true">→</span></Link></div>}
      </article>

      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Meal plans</span><h2>Your plans</h2></div><span className="customer-count">{subscriptions.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your meal plans right now. Refresh this page in a moment.</p> : subscriptions.length ? <ul className="customer-record-list customer-plan-list">
          {subscriptions.map((subscription) => <li key={subscription.id}>
            <div className="customer-record-main"><strong>{subscription.mealPlan.name}</strong><span>{title(subscription.mealPlan.cadence)} · {subscription.mealPlan.mealCount} meals</span><small>Started {date(subscription.startsAt)}{subscription.endsAt ? ` · Ends ${date(subscription.endsAt)}` : ""}{subscription.nextRenewalAt ? ` · Next renewal ${date(subscription.nextRenewalAt)}` : ""}</small></div>
            <div className="customer-record-meta"><b>{money(Number(subscription.mealPlan.price), subscription.mealPlan.currency)}</b><span className={`customer-status customer-status-${subscription.status.toLowerCase()}`}>{title(subscription.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">☷</span><strong>No meal plan yet</strong><span>When you choose a plan through the live marketplace, its status and renewal details will appear here.</span><Link className="text-link" href="/legacy-demo.html">Preview the sample menu <span aria-hidden="true">→</span></Link></div>}
      </article>
    </section>

    {orders.some((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)) && <section className="customer-cancellation-panel" aria-label="Cancel an upcoming meal day">
      <div><span className="eyebrow">Plans stay flexible</span><h2>Need to skip a meal day?</h2><p>Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, goes to your Pausstik wallet.</p></div>
      <ul>{orders.filter((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)).map((order) => <li key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.kitchen.name} · {date(order.scheduledFor)}</small></span><CancelOrderButton orderId={order.id} orderStatus={order.status} scheduledFor={order.scheduledFor.toISOString()} /></li>)}</ul>
    </section>}
    <div className="dashboard-banner customer-demo-note"><strong>Pilot plans and payments:</strong> weekly selections reserve one week only and do not auto-renew. Online checkout is not connected, so this page takes no payment. Wallet credits are recorded in your account.</div>
  </main>;
}
