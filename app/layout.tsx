import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { PwaRuntime } from "@/components/pwa-runtime";
import { MobileNavigation } from "@/components/mobile-navigation";
import "./globals.css";
import "./app-demo.css";
import "./bottom-navigation.css";
import "./install.css";
import "./simple.css";

export const metadata: Metadata = {
  title: {
    default: "Pausstik — Purity. Hygiene. Delivered.",
    template: "%s | Pausstik",
  },
  description: "Discover home-style food from nearby mother-led kitchens. Pausstik is preparing its first neighbourhood marketplace pilot.",
  icons: {
    icon: "/icons/pausstik-app-icon.svg",
    apple: [{ url: "/icons/pausstik-apple-touch-180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pausstik", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#174b3b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Pausstik home">
              <Image className="brand-wordmark" src="/assets/paustik-mother-wordmark.webp" alt="Paustik" width={640} height={310} priority />
              
            </Link>
            <nav className="header-nav" aria-label="Main navigation"><Link href="/#meal-plans">Meals</Link><Link href="/install">Get the app</Link></nav>
            <div className="header-controls">
              <MobileNavigation>
                <summary aria-label="Navigation menu"><span className="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span></summary>
                <nav className="mobile-nav-panel" aria-label="Mobile navigation"><Link href="/#meal-plans">Meals</Link><Link href="/install">Get the app</Link><Link href="/help">Help</Link></nav>
              </MobileNavigation>
              <div className="header-actions">
                <Link className="button button-small" href="/app">Open app</Link>
              </div>
            </div>
          </div>
        </header>
        <PwaRuntime />
        {children}
        <footer className="site-footer">
          <span className="footer-links"><Link href="/">Website</Link><Link href="/help">Help</Link><Link href="/admin-sign-in">Admin</Link></span>
          <small className="footer-copyright">© 2026 Pausstik. All rights reserved.</small>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
