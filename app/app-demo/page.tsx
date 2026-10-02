import type { Metadata } from "next";
import Link from "next/link";
import { AppDemo } from "@/components/app-demo";
import { PwaInstallButton } from "@/components/pwa-runtime";

export const metadata: Metadata = {
  title: "Mobile app preview",
  description: "Try the Pausstik customer, mother, courier and admin app preview on your phone.",
};

export default function AppDemoPage() {
  return <main className="app-demo-page">
    <div className="app-demo-hero">
      <div><span className="eyebrow"><span className="eyebrow-dot" /> Mobile app preview</span><h1>Good food, right around you.</h1><p>Explore the Pausstik phone experience for families, mother-led kitchens, couriers and operations.</p></div>
      <PwaInstallButton />
    </div>
    <div className="app-demo-layout">
      <section className="app-demo-guide" aria-label="About this app preview">
        <div className="preview-label"><span aria-hidden="true">✦</span> INTERACTIVE PREVIEW <b>Sample data</b></div>
        <h2>Choose a role to explore.</h2>
        <p>Try meal discovery and sample ordering, update a sample kitchen menu, move a delivery through its steps, or review the operations view.</p>
        <div className="app-demo-role-list">
          <div><span>01</span><p><strong>Customer</strong><small>Find a mother and choose a meal</small></p><i>⌖</i></div>
          <div><span>02</span><p><strong>Mother</strong><small>Publish a weekly menu</small></p><i>♨</i></div>
          <div><span>03</span><p><strong>Courier</strong><small>Accept and deliver orders</small></p><i>↗</i></div>
          <div><span>04</span><p><strong>Admin</strong><small>Review activity and income</small></p><i>▤</i></div>
        </div>
        <div className="app-demo-signin"><strong>Ready to use your account?</strong><span>Sign in to open the live workspace for your role.</span><Link className="button" href="/sign-in">Sign in to Pausstik <span aria-hidden="true">→</span></Link><Link className="app-demo-admin-link" href="/admin-sign-in">Admin sign in</Link></div>
        <p className="app-demo-note">Preview actions stay on this screen. They don’t create orders, change the database, send messages or take payments.</p>
      </section>
      <AppDemo />
    </div>
  </main>;
}
