import { ResendVerificationForm } from "@/components/auth-forms";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function LocalAccountDemoPage() {
  const user = await requireAuthenticatedUser();
  return <main className="dashboard-shell">
    <section className="status-card">
      <span className="eyebrow">Local account preview</span>
      <h1>Your sign-in is working, {user.name.split(" ")[0]}.</h1>
      <p>This development account is stored in a local SQLite database on this computer. It is separate from Paustik’s live customer and order data.</p>
      <p><strong>Account type:</strong> {user.role.replaceAll("_", " ").toLowerCase()}</p>
      <p><strong>Email confirmation:</strong> {user.emailVerifiedAt ? "Verified" : "Not verified yet"}</p>
      {!user.emailVerifiedAt && <ResendVerificationForm initialEmail={user.email} />}
      <div className="dashboard-banner">Local demo mode is active because no hosted database URL is configured. The local one-time phone code appears on this device only.</div>
    </section>
  </main>;
}
