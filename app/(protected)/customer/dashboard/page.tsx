import Link from "next/link";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerDeliveryPin, CustomerDeliveryTracking, PlaceOrderButton } from "@/components/customer-marketplace-controls";

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
  meals: { id: string; menuId?: string; name: string; category: string; price: number; serviceDate?: string; servings: number }[];
};

const sampleKitchens: KitchenCard[] = [
  { id: "sample-ananya", name: "Ananya's Home Kitchen", motherName: "Ananya", locality: "Patia", city: "Bhubaneswar", cuisine: "Odia · Vegetarian", rating: 4.9, meals: [{ id: "sample-dal", name: "Dalma lunch box", category: "VEGETARIAN", price: 149, servings: 8 }, { id: "sample-khichdi", name: "Ghee khichdi & sides", category: "VEGETARIAN", price: 129, servings: 8 }] },
  { id: "sample-sabita", name: "Sabita's Rasoi", motherName: "Sabita", locality: "Sailashree Vihar", city: "Bhubaneswar", cuisine: "Odia · Home-style", rating: 4.8, meals: [{ id: "sample-thali", name: "Seasonal veg thali", category: "VEGETARIAN", price: 179, servings: 8 }, { id: "sample-chicken", name: "Chicken curry & rice", category: "NON_VEGETARIAN", price: 219, servings: 8 }] },
  { id: "sample-meera", name: "Meera's Neighbourhood Kitchen", motherName: "Meera", locality: "Chandrasekharpur", city: "Bhubaneswar", cuisine: "North Indian · Vegetarian & non-vegetarian", rating: 4.7, meals: [{ id: "sample-paneer", name: "Paneer lunch bowl", category: "VEGETARIAN", price: 189, servings: 8 }, { id: "sample-egg", name: "Egg curry meal box", category: "NON_VEGETARIAN", price: 169, servings: 8 }] },
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

async function loadNearbyKitchens(city?: string): Promise<KitchenCard[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const kitchens = await prisma.kitchen.findMany({
    where: {
      verificationStatus: "APPROVED", isAcceptingOrders: true,
      ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      menus: { some: { isAvailable: true, serviceDate: { gte: today, lt: weekEnd }, cycle: { status: "PUBLISHED" }, meal: { isAvailable: true } } },
    },
    orderBy: [{ mother: { rating: "desc" } }, { name: "asc" }],
    take: 8,
    select: {
      id: true, name: true, locality: true, city: true, cuisine: true,
      mother: { select: { rating: true, user: { select: { name: true, status: true } } } },
      menus: {
        where: { isAvailable: true, serviceDate: { gte: today, lt: weekEnd }, cycle: { status: "PUBLISHED" }, meal: { isAvailable: true } },
        orderBy: [{ serviceDate: "asc" }, { meal: { name: "asc" } }], take: 12,
        select: { id: true, serviceDate: true, stockCount: true, meal: { select: { id: true, name: true, category: true, price: true } } },
      },
    },
  });
  return kitchens
    .filter((kitchen) => kitchen.mother.user.status === "ACTIVE")
    .map((kitchen) => ({
      id: kitchen.id,
      name: kitchen.name,
      motherName: kitchen.mother.user.name,
      locality: kitchen.locality,
      city: kitchen.city,
      cuisine: kitchen.cuisine,
      rating: Number(kitchen.mother.rating),
      meals: kitchen.menus.map((menu) => ({ menuId: menu.id, id: menu.meal.id, name: menu.meal.name, category: menu.meal.category, price: Number(menu.meal.price), serviceDate: menu.serviceDate.toISOString().slice(0, 10), servings: menu.stockCount })),
    }));
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

  if (!isLocalAuthMode()) {
    try {
      [orders, subscriptions] = await loadCustomerActivity(user.id);
    } catch (error) {
      activityAvailable = false;
      console.error("Pausstik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
    try {
      const address = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { city: true, latitude: true, longitude: true } });
      deliveryCity = address?.city;
      hasDeliveryPin = address?.latitude !== null && address?.latitude !== undefined && address?.longitude !== null && address?.longitude !== undefined;
      kitchens = await loadNearbyKitchens(deliveryCity);
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
      <div><span className="eyebrow">Your Pausstik table</span><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>Your orders, meal plans and account activity in one place.</p></div>
      <Link className="button button-warm customer-menu-cta" href="/legacy-demo.html">Explore sample menu <span aria-hidden="true">→</span></Link>
    </div>

    <section className="customer-stats" aria-label="Your account activity">
      <article className="customer-stat"><span>Orders</span><strong>{paidOrderCount}</strong><small>Saved to your Pausstik account</small></article>
      <article className="customer-stat"><span>Active meal plans</span><strong>{activePlans}</strong><small>Plans with an active status</small></article>
      <article className="customer-stat"><span>Account</span><strong className="customer-stat-active">Active</strong><small>Signed in as a customer</small></article>
    </section>

    <CustomerDeliveryPin initialPinned={hasDeliveryPin} />

    <section className="customer-discovery" aria-labelledby="nearby-kitchens-title">
      <div className="customer-panel-heading"><div><span className="eyebrow">From neighbourhood kitchens</span><h2 id="nearby-kitchens-title">Find your next lunch</h2></div><span className="customer-count">{visibleKitchens.length}</span></div>
      {listingsAreSamples && <p className="customer-demo-label">Sample kitchens and prices for the Bhubaneswar preview. Live listings appear here after kitchens are verified and menus are published.</p>}
      <div className="customer-kitchen-grid">{visibleKitchens.map((kitchen) => <article className="customer-kitchen-card" key={kitchen.id}>
        <div className="customer-kitchen-top"><span className="customer-kitchen-mark" aria-hidden="true">{kitchen.motherName.slice(0, 1)}</span><span className="customer-rating">★ {kitchen.rating.toFixed(1)}</span></div>
        <h3>{kitchen.name}</h3><p className="customer-kitchen-meta">{kitchen.locality}, {kitchen.city} · {kitchen.cuisine}</p>
        <p className="customer-kitchen-mother">Prepared by {kitchen.motherName}</p>
        <ul className="customer-meal-list">{kitchen.meals.length ? kitchen.meals.map((meal) => <li key={meal.menuId ?? meal.id}>
          <span><small>{meal.category === "VEGETARIAN" ? "VEG" : meal.category === "NON_VEGETARIAN" ? "NON-VEG" : title(meal.category)}</small>{meal.name}{meal.serviceDate && <small className="customer-meal-date">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(meal.serviceDate + "T00:00:00.000Z"))} · {meal.servings} left</small>}</span>
          <div><strong>{money(meal.price, "INR")}</strong>{meal.menuId && <PlaceOrderButton menuId={meal.menuId} servings={meal.servings} />}</div>
        </li>) : <li><span>Weekly menu is being prepared</span></li>}</ul>
        {listingsAreSamples ? <Link className="button button-small customer-kitchen-cta" href="/legacy-demo.html">Preview sample menu <span aria-hidden="true">→</span></Link> : <p className="customer-delivery-fee-note">₹30 delivery · amount shown before payment setup · no charge taken online</p>}
      </article>)}</div>
    </section>

    <section className="customer-activity-grid" aria-label="Your orders and meal plans">
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

    <div className="dashboard-banner customer-demo-note"><strong>Payments:</strong> Orders are saved to Pausstik, but online payment is not connected yet. The app does not charge customers or record sales income until a payment provider is connected.</div>
  </main>;
}
