import Link from "next/link";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CancelOrderButton, CustomerDeliveryPin, CustomerDeliveryTracking, CustomerWallet } from "@/components/customer-marketplace-controls";
import { KitchenDiscovery } from "@/components/kitchen-discovery";
import { loadCustomerKitchenDiscovery, sampleCustomerKitchens } from "@/lib/customer-kitchens";

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

export default async function CustomerDashboardPage() {
  const user = await requireRole("CUSTOMER");
  type CustomerActivity = Awaited<ReturnType<typeof loadCustomerActivity>>;
  let orders: CustomerActivity[0] = [];
  let subscriptions: CustomerActivity[1] = [];
  let activityAvailable = true;
  let discovery: Awaited<ReturnType<typeof loadCustomerKitchenDiscovery>> = { kitchens: [], hasDeliveryPin: false, deliveryArea: "", available: true };

  if (!isLocalAuthMode()) {
    try {
      [orders, subscriptions] = await loadCustomerActivity(user.id);
    } catch (error) {
      activityAvailable = false;
      console.error("Pausstik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
    try {
      discovery = await loadCustomerKitchenDiscovery(user.id);
    } catch (error) {
      discovery.available = false;
      console.error("Pausstik kitchen discovery could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
  }

  const activePlans = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const paidOrderCount = orders.length;

  return <main className="dashboard-shell customer-dashboard">
    <div className="dashboard-head customer-dashboard-head">
      <div><span className="eyebrow">Your Pausstik table</span><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>Find a nearby mother, choose the meals you like and reserve at least three days with her for the week.</p></div>
      <Link className="button button-warm customer-menu-cta" href="#customer-discover">Explore kitchens <span aria-hidden="true">→</span></Link>
    </div>

    <section className="customer-stats" aria-label="Your account activity">
      <article className="customer-stat"><span>Orders</span><strong>{paidOrderCount}</strong><small>Saved to your Pausstik account</small></article>
      <article className="customer-stat"><span>Active meal plans</span><strong>{activePlans}</strong><small>Plans with an active status</small></article>
      <article className="customer-stat"><span>Account</span><strong className="customer-stat-active">Active</strong><small>Signed in as a customer</small></article>
    </section>

    <CustomerDeliveryPin initialPinned={discovery.hasDeliveryPin} />

    <KitchenDiscovery kitchens={discovery.kitchens} sampleKitchens={sampleCustomerKitchens()} hasDeliveryPin={discovery.hasDeliveryPin} deliveryArea={discovery.deliveryArea} available={discovery.available} />

    <CustomerWallet />

    <section className="customer-activity-grid" id="order-history" aria-label="Your orders and meal plans">
      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Order history</span><h2>Recent orders</h2></div><span className="customer-count">{orders.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your account activity right now. Refresh this page in a moment.</p> : orders.length ? <ul className="customer-record-list">
          {orders.map((order) => <li key={order.id}>
            <div className="customer-record-main"><strong>{order.orderNumber}</strong><span>{order.kitchen.name} · {order.items.map((item) => `${item.quantity} × ${item.mealName}`).join(", ")}</span><small>Ordered {date(order.orderedAt)} · For {date(order.scheduledFor)}</small>{order.delivery && order.status !== "DELIVERED" && order.status !== "CANCELLED" && <CustomerDeliveryTracking orderId={order.id} orderNumber={order.orderNumber} />}</div>
            <div className="customer-record-meta"><b>{money(Number(order.totalAmount), order.currency)}</b><span className={`customer-status customer-status-${order.status.toLowerCase()}`}>{title(order.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">⌑</span><strong>Your first order will show up here</strong><span>Choose a nearby kitchen, open its menu and order a meal or reserve a subscription. Your saved orders appear here.</span><Link className="text-link" href="#customer-discover">Explore kitchens <span aria-hidden="true">→</span></Link></div>}
      </article>

      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Meal plans</span><h2>Your plans</h2></div><span className="customer-count">{subscriptions.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your meal plans right now. Refresh this page in a moment.</p> : subscriptions.length ? <ul className="customer-record-list customer-plan-list">
          {subscriptions.map((subscription) => <li key={subscription.id}>
            <div className="customer-record-main"><strong>{subscription.mealPlan.name}</strong><span>{title(subscription.mealPlan.cadence)} · {subscription.mealPlan.mealCount} meals</span><small>Started {date(subscription.startsAt)}{subscription.endsAt ? ` · Ends ${date(subscription.endsAt)}` : ""}{subscription.nextRenewalAt ? ` · Next renewal ${date(subscription.nextRenewalAt)}` : ""}</small></div>
            <div className="customer-record-meta"><b>{money(Number(subscription.mealPlan.price), subscription.mealPlan.currency)}</b><span className={`customer-status customer-status-${subscription.status.toLowerCase()}`}>{title(subscription.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">☷</span><strong>No meal plan yet</strong><span>When you choose a plan through the live marketplace, its status and renewal details will appear here.</span><Link className="text-link" href="#customer-discover">Find a kitchen <span aria-hidden="true">→</span></Link></div>}
      </article>
    </section>

    {orders.some((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)) && <section className="customer-cancellation-panel" aria-label="Cancel an upcoming meal day">
      <div><span className="eyebrow">Plans stay flexible</span><h2>Need to skip a meal day?</h2><p>Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, goes to your Pausstik wallet.</p></div>
      <ul>{orders.filter((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)).map((order) => <li key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.kitchen.name} · {date(order.scheduledFor)}</small></span><CancelOrderButton orderId={order.id} orderStatus={order.status} scheduledFor={order.scheduledFor.toISOString()} /></li>)}</ul>
    </section>}
    <div className="dashboard-banner customer-demo-note"><strong>Pilot plans and payments:</strong> weekly selections reserve one week only and do not auto-renew. Online checkout is not connected, so this page takes no payment. Wallet credits are recorded in your account.</div>
  </main>;
}
