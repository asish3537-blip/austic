import { requireRole } from "@/lib/auth";
import Link from "next/link";

export default async function AdminRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("ADMIN");
  return <><nav className="admin-workspace-nav" aria-label="Admin workspace"><Link href="/admin/dashboard">Overview & operations</Link><Link href="/admin/menus">All kitchen menus</Link><Link href="/admin/dashboard#admin-finance-title">Income & payments</Link><Link href="/admin/dashboard#admin-activity-title">Activity & deliveries</Link><Link href="/admin/accounts">Accounts & roles</Link><Link href="/admin/security">Security</Link><Link href="/app-demo">Role previews</Link><Link href="/help">Help</Link></nav>{children}</>;
}
