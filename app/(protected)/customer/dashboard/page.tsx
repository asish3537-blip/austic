import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function CustomerDashboardPage() {
  const user = await requireRole("CUSTOMER");
  return <main className="dashboard-shell">
    <div className="dashboard-head"><div><span className="eyebrow">Your Paustik table</span><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>Your customer account is ready. Nearby kitchen discovery and ordering are the next marketplace phase.</p></div><span className="status-badge">Customer account · Active</span></div>
    <div className="dashboard-card-grid">
      <article className="dashboard-card"><span className="card-icon">⌖</span><h2>Nearby mother-led kitchens</h2><p>The database is ready for neighbourhood, PIN code and service-radius discovery. Live kitchen listings will appear as verified mothers are approved.</p></article>
      <article className="dashboard-card"><span className="card-icon">☷</span><h2>Menus and meal plans</h2><p>Menus can be organized by kitchen and weekly cycle, with vegetarian, non-vegetarian and vegan categories.</p></article>
      <article className="dashboard-card"><span className="card-icon">₹</span><h2>Clear payment breakdown</h2><p>Order records separate the customer charge, meal, delivery, tax, platform fee, refunds and adjustments.</p></article>
    </div>
    <div className="dashboard-banner">The previous menu concept is a sample only; it doesn’t create live orders or take payments. <Link className="text-link" href="/legacy-demo.html">Open the sample menu preview</Link>.</div>
  </main>;
}
