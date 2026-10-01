import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Paustik — Purity. Hygiene. Delivered.",
    template: "%s | Paustik",
  },
  description: "Discover home-style food from nearby mother-led kitchens. Paustik is preparing its first neighbourhood marketplace pilot.",
  icons: { icon: "/assets/paustik-logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Paustik home">
              <Image src="/assets/paustik-wordmark.png" alt="Paustik" width={254} height={82} priority />
            </Link>
            <nav className="header-nav" aria-label="Main navigation">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#meal-plans">Meal plans</Link>
              <Link href="/#for-mothers">For mothers</Link>
              <Link href="/#pricing">Pricing</Link>
            </nav>
            <div className="header-actions">
              <Link href="/sign-in">Sign in</Link>
              <Link className="button button-small" href="/sign-up">Create account</Link>
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <span>Purity. Hygiene. Delivered.</span>
          <span><Link href="/help">Help videos</Link> &nbsp; Good food · Empowered mothers · Healthier neighbourhoods</span>
        </footer>
      </body>
    </html>
  );
}
