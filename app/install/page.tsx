import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PwaInstallButton } from "@/components/pwa-runtime";

export const metadata: Metadata = {
  title: "Install the Pausstik app",
  description: "Add Pausstik to your phone’s home screen. Discover nearby mother-led kitchens and manage your meals from one place.",
};

const deviceGuides = [
  {
    id: "android",
    number: "01",
    name: "Android",
    browser: "Open this page in Chrome",
    steps: [
      "Tap the install button above and follow your browser’s confirmation.",
      "If the prompt does not appear, open the browser menu ⋮ and look for Install app or Add to Home screen.",
      "Open the Pausstik icon on your home screen, then sign in or create your account.",
    ],
  },
  {
    id: "iphone",
    number: "02",
    name: "iPhone & iPad",
    browser: "Open this page in Safari",
    steps: [
      "Tap Share in Safari. Depending on your iOS version, Share may be inside the browser menu.",
      "Choose Add to Home Screen. Keep Open as Web App enabled if that option appears, then tap Add.",
      "Find Pausstik on your home screen and open it. You may need to sign in again in the installed app.",
    ],
  },
  {
    id: "computer",
    number: "03",
    name: "Computer",
    browser: "Use Chrome or Microsoft Edge",
    steps: [
      "Select the install button above, or look for the install option in the address bar or browser menu.",
      "Confirm installation to open Pausstik in its own window.",
      "If your browser does not offer installation, choose Open app and continue in your browser.",
    ],
  },
];

export default function InstallPage() {
  return (
    <main className="install-page">
      <section className="install-hero" aria-labelledby="install-title">
        <div className="install-hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> Pausstik, in your pocket</span>
          <h1 id="install-title">Your neighbourhood.<br /><em>Your home screen.</em></h1>
          <p>Good food from nearby mother-led kitchens, a little closer. Add Pausstik to your phone and come back to your meals in a tap.</p>
          <ul className="install-highlights" aria-label="App features">
            <li><span aria-hidden="true">01</span><div><strong>Discover your kitchen</strong><small>Explore nearby mothers and their available menus.</small></div></li>
            <li><span aria-hidden="true">02</span><div><strong>Make the week yours</strong><small>Choose your meals and a 3–7-day subscription.</small></div></li>
            <li><span aria-hidden="true">03</span><div><strong>Keep everything together</strong><small>Find orders, wallet records and delivery updates in your workspace.</small></div></li>
          </ul>
          <a className="install-guide-link" href="#installation-steps">See the steps for your device <span aria-hidden="true">↓</span></a>
        </div>

        <aside className="install-card" aria-labelledby="install-card-title">
          <div className="install-card-top"><span>INSTALL FROM THIS WEBSITE</span><span className="install-free">Free to install</span></div>
          <Image className="install-app-icon" src="/icons/pausstik-app-icon.svg" alt="Pausstik app icon" width={96} height={96} priority />
          <h2 id="install-card-title">A place for good food.</h2>
          <p>One app for customers, mothers and delivery partners. Your account opens the right workspace for you.</p>
          <div className="install-card-actions">
            <PwaInstallButton />
            <Link className="button button-light" href="/app">Open app <span aria-hidden="true">→</span></Link>
          </div>
          <p className="install-card-note">Installed already? Open the Pausstik icon on your device, or use Open app.</p>
          <div className="install-account-links"><Link href="/sign-in">Sign in</Link><span aria-hidden="true">·</span><Link href="/sign-up">Create account</Link></div>
          <div className="install-card-foot"><span aria-hidden="true">✓</span> Your existing Pausstik account works here.</div>
        </aside>
      </section>

      <section className="install-device-section" id="installation-steps" aria-labelledby="installation-steps-title">
        <div className="install-section-heading"><span className="eyebrow">A few simple steps</span><h2 id="installation-steps-title">Make room for Pausstik.</h2><p>Choose your device below. The install option is provided by your browser.</p></div>
        <div className="install-device-grid">
          {deviceGuides.map((guide) => (
            <article className="install-device-card" key={guide.id} id={`install-${guide.id}`}>
              <span className="install-device-number" aria-hidden="true">{guide.number}</span>
              <h3>{guide.name}</h3><p>{guide.browser}</p>
              <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </article>
          ))}
        </div>
      </section>

      <section className="install-expectations" aria-labelledby="install-expectations-title">
        <div><span className="eyebrow">Before you begin</span><h2 id="install-expectations-title">The same account.<br />A simpler way back.</h2></div>
        <div className="install-expectation-list">
          <div><h3>Stay connected</h3><p>Sign-in, kitchens, menus, orders, payments and delivery tracking need an internet connection. The app will tell you when you are offline.</p></div>
          <div><h3>Clear costs</h3><p>Installing Pausstik is free. Meals and delivery are charged according to your selected plan. Online checkout is not connected in the current pilot.</p></div>
          <div><h3>Your location, with permission</h3><p>Allow location when you want to find kitchens near you. Couriers choose when to share their location for an assigned delivery; keep the app open for tracking.</p></div>
        </div>
      </section>

      <section className="install-faq" aria-labelledby="install-faq-title">
        <div className="install-section-heading"><span className="eyebrow">Need a hand?</span><h2 id="install-faq-title">A little help getting started.</h2></div>
        <details><summary>I cannot see an install option.</summary><p>Open this website directly in Chrome on Android, Safari on iPhone or iPad, or Chrome or Edge on a computer. A browser inside another app may not support installation. If installation is unavailable, <Link href="/app">Open app</Link> gives you the same account experience in your browser.</p></details>
        <details><summary>Do I need to create another account?</summary><p>No. Use your existing Pausstik account. If the installed app asks you to sign in again, use the same phone number or email. New customers, mothers and delivery agents can <Link href="/sign-up">create an account</Link>. Administrators use the <Link href="/admin-sign-in">admin portal</Link>.</p></details>
        <details><summary>Can I try the app before signing in?</summary><p>Yes. The <Link href="/app-demo">sample app preview</Link> lets you explore the different roles. It uses sample data; its actions do not create real orders, take payments or update your account.</p></details>
        <details><summary>How do I update or remove the app?</summary><p>Pausstik loads the current website when you are online. Close and reopen the app if a recent change is not visible yet. You can remove it from your device like other home screen apps; removing the app does not cancel your account, orders or meal subscriptions.</p></details>
        <Link className="install-guide-link" href="/help">View all help guides <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="install-bottom-link"><p>Prefer to browse first?</p><Link href="/">Go to website <span aria-hidden="true">↗</span></Link></footer>
    </main>
  );
}
