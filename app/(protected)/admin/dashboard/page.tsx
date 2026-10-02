import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type CurrencyAmount = { currency: string; amount: number };
type ActivityItem = {
  id: string;
  at: Date;
  title: string;
  detail: string;
  amount?: { value: number; currency: string };
};

function countRows(rows: Array<{ _count: { _all: number } }>) {
  return rows.reduce((total, row) => total + row._count._all, 0);
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency.trim(), maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency.trim()} ${value.toFixed(2)}`;
  }
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timestamp(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function MoneyRows({ rows, empty = "No ledger entries yet." }: { rows: CurrencyAmount[]; empty?: string }) {
  const nonZeroRows = rows.filter((row) => row.amount !== 0);
  if (!nonZeroRows.length) return <p className="admin-empty-inline">{empty}</p>;
  return <ul className="admin-money-rows">{nonZeroRows.map((row) => <li key={row.currency}><span>{row.currency.trim()}</span><strong>{money(row.amount, row.currency)}</strong></li>)}</ul>;
}

export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");
  const activeOrderStatuses = new Set(["DELIVERED", "CANCELLED", "FAILED"]);
  const activeDeliveryStatuses = new Set(["ASSIGNED", "ACCEPTED", "GOING_TO_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"]);

  const [
    userGroups,
    orderGroups,
    deliveryGroups,
    paymentGroups,
    ledgerGroups,
    earningGroups,
    payoutGroups,
    recentUsers,
    recentLogins,
    recentOrderEvents,
    recentPayments,
    recentDeliveries,
    recentPayouts,
    recentAdminActions,
    openComplaints,
    pendingCancellations,
    pendingMealChanges,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role", "status"], _count: { _all: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.delivery.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["status", "currency"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.paymentLedgerEntry.groupBy({ by: ["category", "currency"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.earning.groupBy({ by: ["beneficiaryRole", "status", "currency"], _sum: { netAmount: true }, _count: { _all: true } }),
    prisma.payout.groupBy({ by: ["status", "currency"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: { not: "ADMIN" } }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, role: true, status: true, createdAt: true } }),
    prisma.user.findMany({ where: { lastLoginAt: { not: null } }, orderBy: { lastLoginAt: "desc" }, take: 8, select: { id: true, name: true, role: true, lastLoginAt: true } }),
    prisma.orderEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { order: { select: { orderNumber: true } }, actorUser: { select: { name: true } } } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { order: { select: { orderNumber: true } } } }),
    prisma.delivery.findMany({ orderBy: { updatedAt: "desc" }, take: 8, include: { order: { select: { orderNumber: true } }, agent: { select: { user: { select: { name: true } } } } } }),
    prisma.payout.findMany({ orderBy: { requestedAt: "desc" }, take: 6, include: { user: { select: { name: true } } } }),
    prisma.adminActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { admin: { select: { name: true } } } }),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.cancellationRequest.count({ where: { status: "PENDING" } }),
    prisma.mealChangeRequest.count({ where: { status: "PENDING" } }),
  ]);

  const countFor = (role: string, status?: string) => userGroups
    .filter((row) => row.role === role && (!status || row.status === status))
    .reduce((total, row) => total + row._count._all, 0);
  const totalUsers = countRows(userGroups);
  const pendingPartners = countFor("MOTHER", "PENDING") + countFor("DELIVERY_AGENT", "PENDING");
  const activeOrders = orderGroups.filter((row) => !activeOrderStatuses.has(row.status)).reduce((total, row) => total + row._count._all, 0);
  const activeDeliveries = deliveryGroups.filter((row) => activeDeliveryStatuses.has(row.status)).reduce((total, row) => total + row._count._all, 0);

  const capturedPayments: CurrencyAmount[] = paymentGroups
    .filter((row) => row.status === "CAPTURED")
    .map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) }));
  const platformFees: CurrencyAmount[] = ledgerGroups
    .filter((row) => row.category === "PLATFORM_FEE")
    .map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) }));
  const unpaidEarnings = (role: "MOTHER" | "DELIVERY_AGENT"): CurrencyAmount[] => earningGroups
    .filter((row) => row.beneficiaryRole === role && (row.status === "PENDING" || row.status === "AVAILABLE"))
    .reduce<CurrencyAmount[]>((totals, row) => {
      const existing = totals.find((entry) => entry.currency === row.currency);
      const amount = Number(row._sum.netAmount ?? 0);
      if (existing) existing.amount += amount;
      else totals.push({ currency: row.currency, amount });
      return totals;
    }, []);
  const paidPayouts: CurrencyAmount[] = payoutGroups
    .filter((row) => row.status === "PAID")
    .map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) }));

  const activity: ActivityItem[] = [
    ...recentUsers.map((record) => ({ id: `user-created-${record.id}`, at: record.createdAt, title: "Account created", detail: `${record.name} · ${label(record.role)} · ${label(record.status)}` })),
    ...recentLogins.filter((record) => record.lastLoginAt).map((record) => ({ id: `user-login-${record.id}`, at: record.lastLoginAt!, title: "Account sign-in", detail: `${record.name} · ${label(record.role)}` })),
    ...recentOrderEvents.map((record) => ({ id: `order-event-${record.id}`, at: record.createdAt, title: `Order ${label(record.status)}`, detail: `${record.order.orderNumber}${record.actorUser ? ` · ${record.actorUser.name}` : " · system update"}${record.detail ? ` · ${record.detail}` : ""}` })),
    ...recentPayments.map((record) => ({ id: `payment-${record.id}`, at: record.updatedAt, title: `Payment ${label(record.status)}`, detail: record.order.orderNumber, amount: { value: Number(record.amount), currency: record.currency } })),
    ...recentDeliveries.map((record) => ({ id: `delivery-${record.id}`, at: record.updatedAt, title: `Delivery ${label(record.status)}`, detail: `${record.order.orderNumber}${record.agent ? ` · ${record.agent.user.name}` : " · not assigned"}` })),
    ...recentPayouts.map((record) => ({ id: `payout-${record.id}`, at: record.processedAt ?? record.requestedAt, title: `Payout ${label(record.status)}`, detail: record.user.name, amount: { value: Number(record.amount), currency: record.currency } })),
    ...recentAdminActions.map((record) => ({ id: `admin-${record.id}`, at: record.createdAt, title: label(record.action), detail: `${label(record.entityType)} · ${record.admin.name}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 18);

  const phoneOtpReady = Boolean(process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET && process.env.TWILIO_VERIFY_SERVICE_SID);
  const emailVerificationReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const demoAuth = process.env.PAUSTIK_DEMO_AUTH === "true";
  const orderStatusRows = [...orderGroups].sort((a, b) => b._count._all - a._count._all);
  const deliveryStatusRows = [...deliveryGroups].sort((a, b) => b._count._all - a._count._all);

  return <main className="dashboard-shell admin-dashboard">
    <div className="dashboard-head admin-dashboard-head">
      <div><span className="eyebrow">Pausstik operations</span><h1>Admin overview</h1><p>Track accounts, orders, deliveries and recorded money movement.</p></div>
      <Link className="button button-light" href="/admin/accounts">Manage admin accounts</Link>
      <div className="admin-live-badge"><span aria-hidden="true" /> Live database · {timestamp(new Date())}</div>
    </div>

    {demoAuth && <div className="dashboard-banner admin-warning"><strong>Temporary preview sign-in is on.</strong> Codes are shown in the app and do not verify phone ownership. Disable this mode before accepting real customers.</div>}
    {!demoAuth && !phoneOtpReady && <div className="dashboard-banner admin-warning"><strong>Phone sign-in is not connected.</strong> Customers, mothers and couriers cannot request SMS codes until a phone verification service is configured.</div>}
    {!demoAuth && !emailVerificationReady && <div className="dashboard-banner admin-warning"><strong>Email confirmation is not connected.</strong> Account confirmation links require a configured email sender. Phone-code sign-in does not depend on email.</div>}

    <section className="admin-kpi-grid" aria-label="Marketplace overview">
      <article className="admin-kpi"><span>All accounts</span><strong>{totalUsers}</strong><small>{countFor("CUSTOMER")} customers · {countFor("MOTHER")} mothers · {countFor("DELIVERY_AGENT")} couriers</small></article>
      <article className="admin-kpi"><span>Partner applications to review</span><strong>{pendingPartners}</strong><small>{countFor("MOTHER", "PENDING")} mothers · {countFor("DELIVERY_AGENT", "PENDING")} couriers</small></article>
      <article className="admin-kpi"><span>Orders in progress</span><strong>{activeOrders}</strong><small>Excludes delivered, cancelled and failed orders</small></article>
      <article className="admin-kpi"><span>Deliveries in progress</span><strong>{activeDeliveries}</strong><small>Assigned through out for delivery</small></article>
    </section>

    <section className="admin-section" aria-labelledby="admin-finance-title">
      <div className="admin-section-heading"><div><span className="eyebrow">Finance</span><h2 id="admin-finance-title">Income and payouts</h2></div><span className="admin-section-note">Amounts come from saved Pausstik payment and ledger records.</span></div>
      <div className="admin-finance-grid">
        <article className="admin-panel"><h3>Captured customer payments</h3><MoneyRows rows={capturedPayments} empty="No captured payments yet." /></article>
        <article className="admin-panel"><h3>Pausstik platform fees</h3><MoneyRows rows={platformFees} empty="No platform fees recorded yet." /></article>
        <article className="admin-panel"><h3>Mother earnings awaiting payout</h3><MoneyRows rows={unpaidEarnings("MOTHER")} empty="No unpaid mother earnings." /></article>
        <article className="admin-panel"><h3>Courier earnings awaiting payout</h3><MoneyRows rows={unpaidEarnings("DELIVERY_AGENT")} empty="No unpaid courier earnings." /></article>
        <article className="admin-panel"><h3>Payouts completed</h3><MoneyRows rows={paidPayouts} empty="No completed payouts yet." /></article>
      </div>
      <p className="admin-finance-note">This view reports recorded transactions; it does not collect payments or send bank payouts. Live checkout and payout processing still need a payment-provider integration.</p>
    </section>

    <section className="admin-lower-grid">
      <article className="admin-panel admin-status-panel">
        <div className="admin-section-heading"><div><span className="eyebrow">Operations</span><h2>Order and delivery status</h2></div></div>
        <div className="admin-status-columns">
          <div><h3>Orders</h3>{orderStatusRows.length ? <ul className="admin-status-list">{orderStatusRows.map((row) => <li key={row.status}><span>{label(row.status)}</span><strong>{row._count._all}</strong></li>)}</ul> : <p className="admin-empty-inline">No orders recorded yet.</p>}</div>
          <div><h3>Deliveries</h3>{deliveryStatusRows.length ? <ul className="admin-status-list">{deliveryStatusRows.map((row) => <li key={row.status}><span>{label(row.status)}</span><strong>{row._count._all}</strong></li>)}</ul> : <p className="admin-empty-inline">No delivery jobs recorded yet.</p>}</div>
        </div>
        <div className="admin-attention-row"><span>Open complaints <strong>{openComplaints}</strong></span><span>Cancellation requests <strong>{pendingCancellations}</strong></span><span>Meal changes <strong>{pendingMealChanges}</strong></span></div>
      </article>

      <article className="admin-panel admin-activity-panel">
        <div className="admin-section-heading"><div><span className="eyebrow">Recent activity</span><h2>Marketplace activity</h2></div></div>
        <p className="admin-activity-caption">Registrations, sign-ins, order changes, delivery updates, payments, payouts and logged admin actions.</p>
        {activity.length ? <ol className="admin-activity-list">{activity.map((item) => <li key={item.id}>
          <span className="admin-activity-dot" aria-hidden="true" />
          <div className="admin-activity-copy"><strong>{item.title}</strong><span>{item.detail}</span><time dateTime={item.at.toISOString()}>{timestamp(item.at)}</time></div>
          {item.amount && <b className="admin-activity-amount">{money(item.amount.value, item.amount.currency)}</b>}
        </li>)}</ol> : <div className="admin-empty-state"><strong>No activity recorded yet</strong><span>New accounts, orders and payments will appear here as they are created.</span></div>}
      </article>
    </section>
  </main>;
}
