import { UiText } from "@/components/ui-language";
import { razorpayConfig } from "@/lib/razorpay";
import { RazorpayPayment } from "@/components/razorpay-payment";
import { UpiPayment } from "@/components/upi-payment";
import { upiReceiver } from "@/lib/upi";
import Link from "next/link";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CancelOrderButton, CustomerDeliveryPin, CustomerDeliveryTracking, CustomerWallet } from "@/components/customer-marketplace-controls";
import { KitchenDiscovery } from "@/components/kitchen-discovery";
import { loadCustomerKitchenDiscovery, sampleCustomerKitchens } from "@/lib/customer-kitchens";
import { OrderFeedback } from "@/components/order-feedback";

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
        ratings: { where: { authorId: customerId }, select: { mealScore: true, deliveryScore: true } },
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
      console.error("Paustik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
    try {
      discovery = await loadCustomerKitchenDiscovery(user.id);
    } catch (error) {
      discovery.available = false;
      console.error("Paustik kitchen discovery could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
  }


  return <main className="dashboard-shell customer-dashboard">
    <div className="dashboard-head customer-dashboard-head">
      <div><span className="eyebrow">Your Paustik table</span><h1><UiText text="Your meals"/></h1></div>
    </div>


    <CustomerDeliveryPin initialPinned={discovery.hasDeliveryPin} />

    <KitchenDiscovery kitchens={discovery.kitchens} sampleKitchens={sampleCustomerKitchens()} hasDeliveryPin={discovery.hasDeliveryPin} deliveryArea={discovery.deliveryArea} available={discovery.available} />

    <CustomerWallet />

    <section className="customer-activity-grid" id="order-history" aria-label="Your orders and meal plans">
      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Order history</span><h2><UiText text="Recent orders"/></h2></div><span className="customer-count">{orders.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your account activity right now. Refresh this page in a moment.</p> : orders.length ? <ul className="customer-record-list">
          {orders.map((order) => <li key={order.id}>
            <div className="customer-record-main"><strong>{order.orderNumber}</strong><span>{order.kitchen.name} · {order.items.map((item) => `${item.quantity} × ${item.mealName}`).join(", ")}</span><small>Ordered {date(order.orderedAt)} · For {date(order.scheduledFor)}</small>{order.status !== "CANCELLED" && <CustomerDeliveryTracking orderId={order.id} orderNumber={order.orderNumber} />}{order.status === "DELIVERED" && <OrderFeedback orderId={order.id} initial={{ mealScore: order.ratings.find(r => r.mealScore !== null)?.mealScore ?? null, deliveryScore: order.ratings.find(r => r.deliveryScore !== null)?.deliveryScore ?? null }} />}</div>
            <div className="customer-record-meta">{(upiReceiver() || razorpayConfig()) && order.paymentStatus === "PENDING" && !["CANCELLED", "FAILED"].includes(order.status) && (razorpayConfig() ? <RazorpayPayment orderId={order.id} /> : <UpiPayment orderId={order.id} />)}<b>{money(Number(order.totalAmount), order.currency)}</b><span className={`customer-status customer-status-${order.status.toLowerCase()}`}>{title(order.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">⌑</span><strong>Your first order will show up here</strong><Link className="text-link" href="#customer-discover">Explore kitchens <span aria-hidden="true">→</span></Link></div>}
      </article>

      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Meal plans</span><h2><UiText text="Your plans"/></h2></div><span className="customer-count">{subscriptions.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your meal plans right now. Refresh this page in a moment.</p> : subscriptions.length ? <ul className="customer-record-list customer-plan-list">
          {subscriptions.map((subscription) => <li key={subscription.id}>
            <div className="customer-record-main"><strong>{subscription.mealPlan.name}</strong><span>{title(subscription.mealPlan.cadence)} · {subscription.mealPlan.mealCount} meals</span><small>Started {date(subscription.startsAt)}{subscription.endsAt ? ` · Ends ${date(subscription.endsAt)}` : ""}{subscription.nextRenewalAt ? ` · Next renewal ${date(subscription.nextRenewalAt)}` : ""}</small></div>
            <div className="customer-record-meta"><b>{money(Number(subscription.mealPlan.price), subscription.mealPlan.currency)}</b><span className={`customer-status customer-status-${subscription.status.toLowerCase()}`}>{title(subscription.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">☷</span><strong>No meal plan yet</strong><span>When you choose a plan through the live marketplace, its status and renewal details will appear here.</span><Link className="text-link" href="#customer-discover">Find a kitchen <span aria-hidden="true">→</span></Link></div>}
      </article>
    </section>

    {orders.some((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)) && <section className="customer-cancellation-panel" aria-label="Cancel an upcoming meal day">
      <div><span className="eyebrow">Plans stay flexible</span><h2>Need to skip a meal day?</h2><p>Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, goes to your Paustik wallet.</p></div>
      <ul>{orders.filter((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)).map((order) => <li key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.kitchen.name} · {date(order.scheduledFor)}</small></span><CancelOrderButton orderId={order.id} orderStatus={order.status} scheduledFor={order.scheduledFor.toISOString()} /></li>)}</ul>
    </section>}
    <div className="dashboard-banner customer-demo-note"><strong>Pilot plans and payments:</strong> weekly selections reserve one week only and do not auto-renew. Online checkout is not connected, so this page takes no payment. Wallet credits are recorded in your account.</div>
  </main>;
}
