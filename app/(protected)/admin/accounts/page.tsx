import Link from "next/link";
import { AdminAccountForm } from "@/components/admin-account-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAccountsPage() {
  await requireRole("ADMIN");
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" }, orderBy: { createdAt: "asc" },
    select: { id: true, name: true, username: true, email: true, status: true, createdAt: true },
  });
  return <main className="dashboard-shell admin-dashboard admin-account-page">
    <div className="dashboard-head admin-dashboard-head">
      <div><span className="eyebrow">Access management</span><h1>Administrator accounts</h1><p>Create admin access here. Public sign-up does not offer the administrator role.</p></div>
      <Link className="button button-light" href="/admin/dashboard">Back to overview</Link>
    </div>
    <section className="admin-panel admin-account-create">
      <div className="admin-section-heading"><div><span className="eyebrow">New access</span><h2>Create an administrator</h2></div></div>
      <p className="admin-account-help">Passwords are hashed before they are stored. The new admin signs in with a username and password; the password is never shown again.</p>
      <AdminAccountForm />
    </section>
    <section className="admin-panel admin-account-list">
      <div className="admin-section-heading"><div><span className="eyebrow">Current access</span><h2>Admin team</h2></div></div>
      <div className="admin-admin-list">{admins.map((admin) => <article key={admin.id}>
        <span className="admin-person-mark" aria-hidden="true">{admin.name.slice(0, 1).toUpperCase()}</span>
        <div><strong>{admin.name}</strong><span>@{admin.username || "username not assigned"} · {admin.email}</span></div>
        <small className={`account-status account-status-${admin.status.toLowerCase()}`}>{admin.status.toLowerCase()}</small>
      </article>)}</div>
    </section>
  </main>;
}

