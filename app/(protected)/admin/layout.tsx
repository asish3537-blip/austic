import { NotificationCenter } from "@/components/notification-center";
import { LanguageSelector } from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { AdminConsoleNav } from "@/components/admin-console-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole("ADMIN");
  return <div className="admin-console"><aside className="console-sidebar"><Link className="console-logo" href="/admin/paustik-admin"><Image src="/assets/paustik-mother-wordmark.webp" width={220} height={106} alt="Paustik" priority /></Link><LanguageSelector /><span className="console-label">ADMIN WORKSPACE</span><AdminConsoleNav /><div className="console-sidebar-footer"><Link href="/help">Help centre</Link><Link href="/">Go to website ↗</Link></div></aside><div className="console-main"><header className="console-topbar"><div><span className="console-label">PAUSTIK CONTROL CENTRE</span><strong>Neighbourhood operations</strong></div><div className="console-account"><NotificationCenter/><span>{user.name}<small>Administrator</small></span><SignOutButton /></div></header>{children}</div></div>;
}
