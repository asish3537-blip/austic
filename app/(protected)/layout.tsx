import { NotificationCenter } from "@/components/notification-center";
import { UiText } from "@/components/ui-language";
import { requireAuthenticatedUser } from "@/lib/auth";

import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import {AccountMenu} from "@/components/account-menu";


const mobileNavigation = {
  CUSTOMER: [{ label: "Discover", icon: "⌖", href: "/customer/dashboard#customer-discover" }, { label: "Orders", icon: "▤", href: "/customer/orders#order-history" }, { label: "Wallet", icon: "₹", href: "/customer/wallet" }, { label: "Marketplace", icon: "▧", href: "/customer/marketplace" }, { label: "Website", icon: "↗", href: "/" }],
  MOTHER: [{ label: "Kitchen", icon: "⌂", href: "/mother/dashboard#kitchen-summary" }, { label: "Menu", icon: "☷", href: "/mother/dashboard#weekly-menu" }, { label: "Orders", icon: "▤", href: "/mother/dashboard#incoming-orders" }, { label: "Marketplace", icon: "▧", href: "/mother/marketplace" }, { label: "Website", icon: "↗", href: "/" }],
  DELIVERY_AGENT: [{ label: "Jobs", icon: "▣", href: "/delivery/dashboard#available-jobs" }, { label: "Route", icon: "↗", href: "/delivery/dashboard#delivery-route" }, { label: "Help", icon: "?", href: "/help#courier-onboarding" }, { label: "Website", icon: "⌂", href: "/" }],
  ADMIN: [{ label: "Overview", icon: "▦", href: "/admin/dashboard#admin-overview" }, { label: "Income", icon: "₹", href: "/admin/dashboard#admin-finance-title" }, { label: "Activity", icon: "↻", href: "/admin/dashboard#admin-activity-title" }, { label: "People", icon: "♙", href: "/admin/accounts" }, { label: "Website", icon: "↗", href: "/" }],
} as const;

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuthenticatedUser();
  if(user.role==="CUSTOMER")return <div className="customer-app-shell"><header className="customer-app-header"><Link href="/customer/dashboard" aria-label="Paustik app home"><BrandWordmark width={160} height={78} priority/></Link><AccountMenu name={user.name} role={user.role}/></header>{children}<nav className="app-bottom-nav" aria-label="customer app navigation">{mobileNavigation.CUSTOMER.map(item=><Link href={item.href} key={item.label}><span aria-hidden="true">{item.icon}</span><UiText text={item.label}/></Link>)}</nav></div>;
  return <>
    <div className="dashboard-topline"><span>{user.name} <span className="muted">· {user.role.replaceAll("_", " ").toLowerCase()}</span></span><AccountMenu name={user.name} role={user.role}/></div>
    {user.role !== "ADMIN" && user.status === "ACTIVE" && <div className="notification-toolbar"><NotificationCenter/></div>}
    {children}
    <nav className="app-bottom-nav" aria-label={`${user.role.replaceAll("_", " ").toLowerCase()} app navigation`}>
      {mobileNavigation[user.role].map((item) => <Link href={item.href} key={item.label}><span aria-hidden="true">{item.icon}</span><UiText text={item.label}/></Link>)}
    </nav>

  </>;
}
