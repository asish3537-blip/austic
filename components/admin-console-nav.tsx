"use client";
import { UiText } from "@/components/ui-language";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["Overview", "/admin/paustik-admin", "▦"], ["Orders", "/admin/orders", "▤"], ["App preview", "/admin/app-preview", "▣"],
  ["ScooFoo schools", "/admin/scoofoo", "⌂"], ["Dispatch & offers", "/admin/dispatch", "↗"], ["Bulk delivery", "/admin/bulk", "▤"], ["Kitchen quality", "/admin/quality", "✓"],
  ["Analytics", "/admin/analytics", "↗"], ["Operations map", "/admin/map", "⌖"], ["Kitchens & menus", "/admin/menus", "☷"],
  ["Product marketplace", "/admin/marketplace", "▧"],
  ["Demo marketplace & P&L", "/admin/demo-marketplace", "◉"],
  ["Partner earnings", "/admin/earnings", "₹"], ["Finance & activity", "/admin/dashboard", "₹"], ["Accounts & roles", "/admin/accounts", "♙"],
  ["Payment settings", "/admin/payment-setup", "↗"], ["Test evidence", "/admin/test-evidence", "✓"], ["Security", "/admin/security", "◇"],
];
export function AdminConsoleNav() {
  const path = usePathname();
  return <nav className="console-nav" aria-label="Admin sections">{links.map(([name, href, icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><span aria-hidden="true">{icon}</span>{<UiText text={name}/>}</Link>)}</nav>;
}
