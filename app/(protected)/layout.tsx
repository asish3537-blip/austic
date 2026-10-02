import { requireAuthenticatedUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";
import { PausstikAssistant } from "@/components/pausstik-assistant";

const mobileNavigation = {
  CUSTOMER: [{ label: "Discover", icon: "⌖", href: "/customer/dashboard#customer-discover" }, { label: "Orders", icon: "▤", href: "/customer/dashboard#order-history" }, { label: "Wallet", icon: "₹", href: "/customer/dashboard#wallet-section" }, { label: "Help", icon: "?", href: "/help" }, { label: "Website", icon: "↗", href: "/" }],
  MOTHER: [{ label: "Kitchen", icon: "⌂", href: "/mother/dashboard#kitchen-summary" }, { label: "Menu", icon: "☷", href: "/mother/dashboard#weekly-menu" }, { label: "Orders", icon: "▤", href: "/mother/dashboard#incoming-orders" }, { label: "Meals", icon: "♨", href: "/mother/dashboard#scheduled-menu" }, { label: "Website", icon: "↗", href: "/" }],
  DELIVERY_AGENT: [{ label: "Jobs", icon: "▣", href: "/delivery/dashboard#available-jobs" }, { label: "Route", icon: "↗", href: "/delivery/dashboard#delivery-route" }, { label: "Help", icon: "?", href: "/help#courier-onboarding" }, { label: "Website", icon: "⌂", href: "/" }],
  ADMIN: [{ label: "Overview", icon: "▦", href: "/admin/dashboard#admin-overview" }, { label: "Income", icon: "₹", href: "/admin/dashboard#admin-finance-title" }, { label: "Activity", icon: "↻", href: "/admin/dashboard#admin-activity-title" }, { label: "People", icon: "♙", href: "/admin/accounts" }, { label: "Website", icon: "↗", href: "/" }],
} as const;

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuthenticatedUser();
  return <>
    <div className="dashboard-topline"><span>{user.name} <span className="muted">· {user.role.replaceAll("_", " ").toLowerCase()}</span></span><SignOutButton /></div>
    {children}
    <nav className="app-bottom-nav" aria-label={`${user.role.replaceAll("_", " ").toLowerCase()} app navigation`}>
      {mobileNavigation[user.role].map((item) => <Link href={item.href} key={item.label}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
    </nav>
    <PausstikAssistant />
  </>;
}
