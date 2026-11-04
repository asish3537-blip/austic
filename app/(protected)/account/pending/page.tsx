import { requireAuthenticatedUser } from "@/lib/auth";

export default async function PendingAccountPage() {
  const user = await requireAuthenticatedUser();
  return <main className="dashboard-shell"><section className="status-card">
    <span className="status-badge">● Application under review</span>
    <h1>Thanks for joining Paustik, {user.name.split(" ")[0]}.</h1>
    <p>Your {user.role === "MOTHER" ? "mother entrepreneur and kitchen" : "delivery agent"} application is saved. The Paustik operations team must verify and approve it before you receive orders or publish a live menu.</p>
    <p><strong>Account status:</strong> {user.status}</p>
    <div className="dashboard-banner">Your sign-in is active so you can return to this page. Account review and approval are performed through secure operations tools.</div>
  </section></main>;
}
