import { expireOverdueOrders } from "@/lib/overdue-orders";
import { OrdersRefresh } from "@/components/orders-refresh";
import { UiText } from "@/components/ui-language";
import { razorpayConfig } from "@/lib/razorpay";
import { RazorpayPayment } from "@/components/razorpay-payment";
import { UpiPayment } from "@/components/upi-payment";
import { upiReceiver } from "@/lib/upi";
import Link from "next/link";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { requireRole } from "@/lib/auth";
import {loadCustomerActivity} from "@/lib/customer-activity";
import { CancelOrderButton, CustomerDeliveryTracking } from "@/components/customer-marketplace-controls";


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

export default async function CustomerOrderHistory({ searchParams,productsOnly=false }: { searchParams: Promise<{ page?: string }>;productsOnly?:boolean }) {
  const requestedPage = Number((await searchParams).page || 1);
  let page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const user = await requireRole("CUSTOMER");
  type CustomerActivity = Awaited<ReturnType<typeof loadCustomerActivity>>;
  let orders: CustomerActivity[0] = [];
  let subscriptions: CustomerActivity[1] = [];
  let activityAvailable = true;
  let orderCount = 0;

  if (!isLocalAuthMode()) {
    try {
      await expireOverdueOrders(user.id);
      [orders, subscriptions, orderCount] = await loadCustomerActivity(user.id, page,productsOnly);
      const lastPage = Math.max(1, Math.ceil(orderCount / 20));
      if (page > lastPage) { page = lastPage; [orders, subscriptions, orderCount] = await loadCustomerActivity(user.id, page,productsOnly); }
    } catch (error) {
      activityAvailable = false;
      console.error("Paustik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
  }



  const activityPanel = (
    <section className="customer-activity-grid" id="order-history" aria-label="Your orders and meal plans">
      <article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Order history</span><h2><UiText text={productsOnly?"Product purchases & tracking":"Your orders & tracking"}/></h2><p>{productsOnly?"Follow your product delivery agreements and purchases.":"Follow each meal from kitchen to doorstep."}</p></div><span className="customer-count">{orderCount}</span><OrdersRefresh active={orders.some(order => !["DELIVERED", "CANCELLED", "FAILED"].includes(order.status))}/></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your account activity right now. Refresh this page in a moment.</p> : orders.length ? <ul className="customer-record-list">
          {orders.map((order, index) => <li id={"order-"+order.id} key={order.id}>
            <div className="customer-record-main"><strong>{order.orderNumber}</strong><span>{order.kitchen.name} · {order.items.map((item) => `${item.quantity} × ${item.mealName}`).join(", ")}</span><small>Ordered {date(order.orderedAt)} · For {date(order.scheduledFor)}</small><details className="order-price-breakdown"><summary>Payment breakdown</summary><p>Food {money(Number(order.subtotal), order.currency)} + delivery {money(Number(order.deliveryFee), order.currency)} + tax {money(Number(order.taxAmount), order.currency)} − discount {money(Number(order.discountAmount), order.currency)}</p><strong>Total {money(Number(order.totalAmount), order.currency)}</strong></details>{order.status !== "CANCELLED" && <CustomerDeliveryTracking orderId={order.id} orderNumber={order.orderNumber} initiallyOpen={index === 0 && !["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)} />}{order.status === "DELIVERED" && <OrderFeedback orderId={order.id} initial={{ mealScore: order.ratings.find(r => r.mealScore !== null)?.mealScore ?? null, deliveryScore: order.ratings.find(r => r.deliveryScore !== null)?.deliveryScore ?? null }} />}</div>
            <div className="customer-record-meta">{(upiReceiver() || razorpayConfig()) && order.paymentStatus === "PENDING" && !["CANCELLED", "FAILED"].includes(order.status) && (razorpayConfig() ? <RazorpayPayment orderId={order.id} /> : <UpiPayment orderId={order.id} />)}<b>{money(Number(order.totalAmount), order.currency)}</b><span className={`customer-status customer-status-${order.status.toLowerCase()}`}>{title(order.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">⌑</span><strong>{productsOnly?"Your product purchases will appear here":"Your first order will show up here"}</strong><Link className="text-link" href={productsOnly?"/customer/marketplace":"/customer/dashboard#customer-discover"}>{productsOnly?"Browse products":"Explore kitchens"} <span aria-hidden="true">→</span></Link></div>}
        {orderCount > 20 && <nav className="console-pagination" aria-label="Order history pages">{page > 1 && <Link href={"?page=" + (page - 1) + "#order-history"}>← Newer orders</Link>}<span>Page {page} of {Math.ceil(orderCount / 20)}</span>{page * 20 < orderCount && <Link href={"?page=" + (page + 1) + "#order-history"}>Older orders →</Link>}</nav>}
      </article>

      {!productsOnly&&<article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow">Meal plans</span><h2><UiText text="Your plans"/></h2></div><span className="customer-count">{subscriptions.length}</span></div>
        {!activityAvailable ? <p className="customer-empty">We couldn’t load your meal plans right now. Refresh this page in a moment.</p> : subscriptions.length ? <ul className="customer-record-list customer-plan-list">
          {subscriptions.map((subscription) => <li key={subscription.id}>
            <div className="customer-record-main"><strong>{subscription.mealPlan.name}</strong><span>{title(subscription.mealPlan.cadence)} · {subscription.mealPlan.mealCount} meals</span><small>Started {date(subscription.startsAt)}{subscription.endsAt ? ` · Ends ${date(subscription.endsAt)}` : ""}{subscription.nextRenewalAt ? ` · Next renewal ${date(subscription.nextRenewalAt)}` : ""}</small></div>
            <div className="customer-record-meta"><b>{money(Number(subscription.mealPlan.price), subscription.mealPlan.currency)}</b><span className={`customer-status customer-status-${subscription.status.toLowerCase()}`}>{title(subscription.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">☷</span><strong>No meal plan yet</strong><span>When you choose a plan through the live marketplace, its status and renewal details will appear here.</span><Link className="text-link" href="/customer/dashboard#customer-discover">Find a kitchen <span aria-hidden="true">→</span></Link></div>}
      </article>}
    </section>
  );

  return <main className={"dashboard-shell customer-dashboard"+(productsOnly?" customer-product-purchases":"")}>
    <div className="dashboard-head customer-dashboard-head">
      <div><Link className="text-link" href={productsOnly?"/customer/marketplace":"/customer/dashboard"}>{productsOnly?"← Browse products":"← Discover kitchens"}</Link><h1><UiText text={productsOnly?"Product purchases":"Orders & history"}/></h1></div>
    </div>


    <nav className="settings-links"><Link href="/customer/orders">Meal orders & history</Link><Link href="/customer/purchases">Product purchases & tracking</Link></nav>{activityPanel}
    {orders.some((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)) && <section className="customer-cancellation-panel" aria-label="Cancel an upcoming meal day">
      <div><span className="eyebrow">Plans stay flexible</span><h2>{productsOnly?"Need to cancel a product delivery?":"Need to skip a meal day?"}</h2><p>Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, goes to your Paustik wallet.</p></div>
      <ul>{orders.filter((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)).map((order) => <li key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.kitchen.name} · {date(order.scheduledFor)}</small></span><CancelOrderButton orderId={order.id} orderStatus={order.status} scheduledFor={order.scheduledFor.toISOString()} /></li>)}</ul>
    </section>}
  </main>;
}
