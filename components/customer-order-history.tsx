import { PaymentMethods } from "@/components/payment-methods";
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

export default async function CustomerOrderHistory({ searchParams,productsOnly=false }: { searchParams: Promise<{ page?: string; history?: string }>;productsOnly?:boolean }) {
  const checkoutReady=Boolean(razorpayConfig()&&process.env.RAZORPAY_WEBHOOK_SECRET);
  const params=await searchParams;
  const requestedPage = Number(params.page || 1);
  let page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const user = await requireRole("CUSTOMER");
  type CustomerActivity = Awaited<ReturnType<typeof loadCustomerActivity>>;
  let orders: CustomerActivity[0] = [];
  let activeOrders: CustomerActivity[3] = [];
  let subscriptions: CustomerActivity[1] = [];
  let activityAvailable = true;
  let orderCount = 0;

  if (!isLocalAuthMode()) {
    try {
      await expireOverdueOrders(user.id);
      [orders, subscriptions, orderCount, activeOrders] = await loadCustomerActivity(user.id, page,productsOnly);
      const lastPage = Math.max(1, Math.ceil(orderCount / 20));
      if (page > lastPage) { page = lastPage; [orders, subscriptions, orderCount, activeOrders] = await loadCustomerActivity(user.id, page,productsOnly); }
    } catch (error) {
      activityAvailable = false;
      console.error("Paustik customer activity could not be loaded.", error instanceof Error ? error.name : "unknown error");
    }
  }



  const renderOrders=(list:CustomerActivity[0])=><ul className="customer-record-list">{list.map((order, index) => <li id={"order-"+order.id} key={order.id}>
            <div className="customer-record-main"><strong>{order.orderNumber}</strong><span>{order.kitchen.name} · {order.items.map((item) => `${item.quantity} × ${item.mealName}`).join(", ")}</span><small><UiText text="Ordered"/>{date(order.orderedAt)} <UiText text="· For"/>{date(order.scheduledFor)}</small><details className="order-price-breakdown"><summary><UiText text="Payment breakdown"/></summary><p><UiText text="Food"/>{money(Number(order.subtotal), order.currency)} <UiText text="+ delivery"/>{money(Number(order.deliveryFee), order.currency)} <UiText text="+ tax"/>{money(Number(order.taxAmount), order.currency)} <UiText text="− discount"/>{money(Number(order.discountAmount), order.currency)}</p><strong><UiText text="Total"/>{money(Number(order.totalAmount), order.currency)}</strong></details>{order.status !== "CANCELLED" && <CustomerDeliveryTracking orderId={order.id} orderNumber={order.orderNumber} initiallyOpen={index === 0 && !["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)} />}{order.status === "DELIVERED" && <OrderFeedback orderId={order.id} initial={{ mealScore: order.ratings.find(r => r.mealScore !== null)?.mealScore ?? null, deliveryScore: order.ratings.find(r => r.deliveryScore !== null)?.deliveryScore ?? null }} />}</div>
            <div className="customer-record-meta">{order.paymentStatus==="PENDING"&&! ["CANCELLED","FAILED"].includes(order.status)&&<strong><UiText text="Balance due"/> {money(order.payments.reduce((sum,p)=>sum+Number(p.amount),0),order.currency)}</strong>}{(upiReceiver() || checkoutReady) && order.paymentStatus === "PENDING" && !["CANCELLED", "FAILED"].includes(order.status) && (checkoutReady ? <RazorpayPayment orderId={order.id} /> : <UpiPayment orderId={order.id} />)}{order.paymentStatus === "PENDING" && !checkoutReady && !upiReceiver() && <p className="payment-pending"><UiText text="Online payment needs setup"/></p>}<b>{money(Number(order.totalAmount), order.currency)}</b><span className={`customer-status customer-status-${order.status.toLowerCase()}`}><UiText text={title(order.status)}/></span></div>
          </li>)}
</ul>;
  const activityPanel=<section className="customer-compact-orders">
    <article className="customer-panel" id="order-history"><div className="customer-panel-heading"><h2><UiText text="Active orders"/></h2><span className="customer-count">{activeOrders.length}</span><OrdersRefresh active={activeOrders.length>0}/></div>
      {!activityAvailable?<p role="status"><UiText text="Orders could not load."/></p>:activeOrders.length?renderOrders(activeOrders):<div className="compact-order-empty"><strong><UiText text="No active orders"/></strong><p><UiText text="Your new orders will appear here. Previous orders are in history below."/></p><Link className="text-link" href={productsOnly?"/customer/marketplace":"/customer/dashboard"}><UiText text={productsOnly?"Browse products":"Explore kitchens"}/> →</Link></div>}
    </article>
    <details className="customer-order-archive" id="past-orders" open={page>1||params.history==="1"}><summary><UiText text="Order history"/> · {orderCount}</summary><p><UiText text="Completed and cancelled orders"/></p>{renderOrders(orders)}
    {orderCount>20&&<nav className="console-pagination" aria-label="Order history pages">{page>1&&<Link href={"?history=1&page="+(page-1)+"#past-orders"}><UiText text="← Newer orders"/></Link>}<span><UiText text="Page"/> {page} / {Math.ceil(orderCount/20)}</span>{page*20<orderCount&&<Link href={"?history=1&page="+(page+1)+"#past-orders"}><UiText text="Older orders →"/></Link>}</nav>}</details>
    {!productsOnly&&<details className="customer-order-archive"><summary><UiText text="Your plans"/> · {subscriptions.length}</summary>      {true&&<article className="customer-panel">
        <div className="customer-panel-heading"><div><span className="eyebrow"><UiText text="Meal plans"/></span><h2><UiText text="Your plans"/></h2></div><span className="customer-count">{subscriptions.length}</span></div>
        {!activityAvailable ? <p className="customer-empty"><UiText text="We couldn’t load your meal plans right now. Refresh this page in a moment."/></p> : subscriptions.length ? <ul className="customer-record-list customer-plan-list">
          {subscriptions.map((subscription) => <li key={subscription.id}>
            <div className="customer-record-main"><strong>{subscription.mealPlan.name}</strong><span>{title(subscription.mealPlan.cadence)} · {subscription.mealPlan.mealCount} <UiText text="meals"/></span><small><UiText text="Started"/>{date(subscription.startsAt)}{subscription.endsAt ? ` · Ends ${date(subscription.endsAt)}` : ""}{subscription.nextRenewalAt ? ` · Next renewal ${date(subscription.nextRenewalAt)}` : ""}</small></div>
            <div className="customer-record-meta"><b>{money(Number(subscription.mealPlan.price), subscription.mealPlan.currency)}</b><span className={`customer-status customer-status-${subscription.status.toLowerCase()}`}>{title(subscription.status)}</span></div>
          </li>)}
        </ul> : <div className="customer-empty-state"><span className="card-icon" aria-hidden="true">☷</span><strong><UiText text="No meal plan yet"/></strong><span><UiText text="When you choose a plan through the live marketplace, its status and renewal details will appear here."/></span><Link className="text-link" href="/customer/dashboard#customer-discover"><UiText text="Find a kitchen"/><span aria-hidden="true">→</span></Link></div>}
      </article>}</details>}
  </section>;

  return <main className={"dashboard-shell customer-dashboard"+(productsOnly?" customer-product-purchases":"")}>
    <div className="dashboard-head customer-dashboard-head">
      <div><Link className="text-link" href={productsOnly?"/customer/marketplace":"/customer/dashboard"}><UiText text={productsOnly?"← Browse products":"← Discover kitchens"}/></Link><h1><UiText text={productsOnly?"Product purchases":"Orders & history"}/></h1></div>
    </div>


    <nav className="settings-links"><Link href="/customer/orders"><UiText text="Meal orders & history"/></Link><Link href="/customer/purchases"><UiText text="Product purchases & tracking"/></Link></nav>{activityPanel}<PaymentMethods/>
    {activeOrders.some((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)) && <section className="customer-cancellation-panel" aria-label="Cancel an upcoming meal day">
      <div><span className="eyebrow"><UiText text="Plans stay flexible"/></span><h2><UiText text={productsOnly?"Need to cancel a product delivery?":"Need to skip a meal day?"}/></h2><p><UiText text="Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, goes to your Paustik wallet."/></p></div>
      <ul>{activeOrders.filter((order) => ["ORDER_PLACED", "CONFIRMED"].includes(order.status)).map((order) => <li key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.kitchen.name} · {date(order.scheduledFor)}</small></span><CancelOrderButton orderId={order.id} orderStatus={order.status} scheduledFor={order.scheduledFor.toISOString()} /></li>)}</ul>
    </section>}
  </main>;
}
