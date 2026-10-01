import { requireRole } from "@/lib/auth";

export default async function DeliveryDashboardPage() {
  const user = await requireRole("DELIVERY_AGENT");
  return <main className="dashboard-shell">
    <div className="dashboard-head"><div><span className="eyebrow">Delivery partner workspace</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Delivery tasks will only be visible to the agent assigned to each order.</p></div><span className="status-badge">Agent approval required</span></div>
    <div className="dashboard-card-grid">
      <article className="dashboard-card"><span className="card-icon">⌖</span><h2>Assigned deliveries</h2><p>Accept, collect and complete deliveries in the assigned-agent workflow.</p></article>
      <article className="dashboard-card"><span className="card-icon">⌁</span><h2>Consent-based tracking</h2><p>The existing live tracking pilot remains a separate service. Location sharing requires courier consent.</p></article>
      <article className="dashboard-card"><span className="card-icon">₹</span><h2>Earnings and payouts</h2><p>Delivery earnings and payout records have separate ledger categories; payment processing is not connected.</p></article>
    </div>
    <div className="dashboard-banner">Your application must be approved before deliveries can be assigned. Do not share personal or bank information in messages.</div>
  </main>;
}
