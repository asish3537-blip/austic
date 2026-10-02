import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pausstik — Purity. Hygiene. Delivered.",
    template: "%s | Pausstik",
  },
  description: "Discover home-style food from nearby mother-led kitchens. Pausstik is preparing its first neighbourhood marketplace pilot.",
  icons: { icon: "/assets/paustik-logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Pausstik home">
              <span className="brand-icon" aria-hidden="true"><Image src="/assets/paustik-wordmark.png" alt="" width={1274} height={410} priority /></span>
              <span className="brand-name">Pausstik</span>
            </Link>
            <nav className="header-nav" aria-label="Main navigation">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#meal-plans">Meal plans</Link>
              <Link href="/#for-mothers">For mothers</Link>
              <Link href="/#pricing">Pricing</Link>
            </nav>
            <div className="header-controls">
              <details className="mobile-nav">
                <summary aria-label="Open navigation menu"><span className="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span></summary>
                <nav className="mobile-nav-panel" aria-label="Mobile navigation">
                  <Link href="/#how-it-works">How it works</Link>
                  <Link href="/#meal-plans">Meal plans</Link>
                  <Link href="/#for-mothers">For mothers</Link>
                  <Link href="/#pricing">Pricing</Link>
                  <Link href="/sign-in">Sign in</Link>
                  <Link href="/admin-sign-in">Admin portal</Link>
                </nav>
              </details>
              <div className="header-actions">
                <Link href="/sign-in">Sign in</Link>
                <Link className="button button-small" href="/sign-up">Create account</Link>
              </div>
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <span>Purity. Hygiene. Delivered.</span>
          <span className="footer-links"><Link href="/help">Help videos</Link><Link className="footer-admin-link" href="/admin-sign-in">Admin portal</Link><Link href="/admin-setup">Create admin account</Link><Link href="/forgot-password">Reset password</Link></span>
          <small className="footer-copyright">© 2026 Pausstik. All rights reserved.</small>
        </footer>
      </body>
    </html>
  );
}
