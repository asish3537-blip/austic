import { requireRole } from "@/lib/auth";

export default async function MotherDashboardPage() {
  const user = await requireRole("MOTHER");
  return <main className="dashboard-shell">
    <div className="dashboard-head"><div><span className="eyebrow">Mother entrepreneur workspace</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Your role is protected by your Paustik account.</p></div><span className="status-badge">Kitchen approval required</span></div>
    <div className="dashboard-card-grid">
      <article className="dashboard-card"><span className="card-icon">♨</span><h2>Kitchen verification</h2><p>Approval gates live meal publishing and order assignments. Your application is saved for the operations review flow.</p></article>
      <article className="dashboard-card"><span className="card-icon">☷</span><h2>Menu and weekly cycles</h2><p>The database supports dated draft/published menu cycles and dish availability. Mother menu editing is the next marketplace feature phase.</p></article>
      <article className="dashboard-card"><span className="card-icon">◷</span><h2>Meal changes and cancellations</h2><p>Policy records can set cut-off windows and rules. Customer-facing terms are versioned with a plan or order.</p></article>
    </div>
    <div className="dashboard-banner">Do not enter bank details here. Payout onboarding will use a payment provider’s secure account-linking flow when that integration is added.</div>
  </main>;
}
