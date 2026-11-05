"use client";
import { UiText } from "@/components/ui-language";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["Overview", "/admin/paustik-admin", "▦"], ["Orders", "/admin/orders", "▤"], ["App preview", "/admin/app-preview", "▣"],
  ["Analytics", "/admin/analytics", "↗"], ["Operations map", "/admin/map", "⌖"], ["Kitchens & menus", "/admin/menus", "☷"],
  ["Demo marketplace & P&L", "/admin/demo-marketplace", "◉"],
  ["Finance & activity", "/admin/dashboard", "₹"], ["Accounts & roles", "/admin/accounts", "♙"],
  ["Payment settings", "/admin/payment-setup", "↗"], ["Test evidence", "/admin/test-evidence", "✓"], ["Security", "/admin/security", "◇"],
];
export function AdminConsoleNav() {
  const path = usePathname();
  return <nav className="console-nav" aria-label="Admin sections">{links.map(([name, href, icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><span aria-hidden="true">{icon}</span>{<UiText text={name}/>}</Link>)}</nav>;
}
