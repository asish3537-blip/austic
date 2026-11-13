import "./scoofoo.css";
import { SiteFooter } from "@/components/site-footer";
import { PaustikHelp as PausstikAssistant } from "@/components/paustik-help";
import { UiText } from "@/components/ui-language";
import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { PwaRuntime } from "@/components/pwa-runtime";
import { MobileNavigation } from "@/components/mobile-navigation";
import { LanguageProvider, LanguageSelector } from "@/components/ui-language";
import "./globals.css";
import "./app-demo.css";
import "./bottom-navigation.css";
import "./install.css";
import "./simple.css";
import "./brand-theme.css";
import "./admin-console.css";
import "./pilot-ui.css";
import "./app-workspace.css";
import "./notifications-maps.css";
import "./journey-branding.css";
import "./food-marketplace.css";
import "./customer-home.css";
import "./voice-help.css";
import "./editorial-home.css";
import "./pilot-refresh.css";
import "./action-first.css";

export const metadata: Metadata = {
  title: {
    default: "Paustik — Purity. Hygiene. Delivered.",
    template: "%s | Paustik",
  },
  description: "Discover home-style food from nearby mother-led kitchens. Paustik is preparing its first neighbourhood marketplace pilot.",
  icons: {
    icon: [{ url: "/icons/pausstik-app-192.png?v=4", type: "image/png", sizes: "192x192" }],
    shortcut: "/icons/pausstik-app-192.png?v=4",
    apple: [{ url: "/icons/pausstik-apple-touch-180.png?v=4", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Paustik", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#b52c2e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <LanguageProvider>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Paustik home">
              <Image className="brand-wordmark" src="/assets/paustik-mother-wordmark.webp" alt="Paustik" width={640} height={310} priority />
              
            </Link>
            <nav className="header-nav" aria-label="Main navigation"><Link href="/#customers">Customers</Link><Link href="/#for-mothers">Mother Kitchens</Link><Link href="/#for-delivery">Delivery Partners</Link><Link href="/#download">Get the app</Link></nav>
            <div className="header-controls">
              <LanguageSelector />
              <MobileNavigation>
                <summary aria-label="Navigation menu"><span className="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span><span><UiText text="Menu"/></span></summary>
                <nav className="mobile-nav-panel" aria-label="Mobile navigation"><Link href="/#customers">Customers</Link><Link href="/#for-mothers">Mother Kitchens</Link><Link href="/#for-delivery">Delivery Partners</Link><Link href="/#meal-plans"><UiText text="Meals"/></Link><Link href="/install"><UiText text="Get the app"/></Link><Link href="/help"><UiText text="Help"/></Link></nav>
              </MobileNavigation>
              <div className="header-actions">
                <Link className="button button-small" href="/app"><UiText text="Open app"/></Link>
              </div>
            </div>
          </div>
        </header>
        <PwaRuntime />
        {children}
        <PausstikAssistant />
        <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
