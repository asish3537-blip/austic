import Link from "next/link";
import { AdminAuthenticatorSettings } from "@/components/admin-authenticator-settings";
import { requireRole } from "@/lib/auth";
import "@/app/admin-security.css";

export default async function AdminSecurityPage() {
  await requireRole("ADMIN");

  return <main className="dashboard-shell admin-dashboard admin-security-page">
    <div className="dashboard-head admin-dashboard-head">
      <div><span className="eyebrow">Your admin account</span><h1>Admin security</h1><p>Add an authenticator app to protect your administrator sign-in.</p></div>
      <Link className="button button-light" href="/admin/dashboard">Back to overview</Link>
    </div>
    <AdminAuthenticatorSettings />
  </main>;
}
