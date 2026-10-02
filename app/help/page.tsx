import Link from "next/link";

const guides = [
  {
    slug: "account-setup",
    title: "Create an account with SMS or WhatsApp",
    status: "Available now · SMS / WhatsApp setup required",
    text: "Choose a role, use the temporary on-page code, and reach the right workspace.",
    steps: [
      "Select Customer, Mother entrepreneur, or Delivery agent on the sign-up page.",
      "Choose SMS or WhatsApp, enter your number, and request a 6-digit code. Preview mode shows the code on the page and sends no message.",
      "WhatsApp delivery works only after Paustik's WhatsApp sender is configured in Twilio Verify. If it is not enabled, choose SMS.",
      "Enter the code shown on the page to create your account and continue to your role workspace.",
      "Mother and courier accounts wait for Paustik approval; active customers open their workspace.",
      "Admin accounts are not available on public sign-up. An active admin creates them in the admin panel.",
    ],
  },
  {
    slug: "customer-workspace",
    title: "Customer workspace and ordering",
    status: "Account available · Ordering upcoming",
    text: "See what customers can do today and what the nearby menu and checkout journey will add.",
    steps: [
      "Create a Customer account with the preview code, then sign in with another on-page code.",
      "The current workspace introduces nearby mother-led kitchens and menu categories.",
      "Kitchen search, vegetarian and non-vegetarian menus, and daily or weekly plans are coming next.",
      "Checkout is not active. The app does not place or charge for an order today.",
    ],
  },
  {
    slug: "mother-onboarding",
    title: "Mother entrepreneur onboarding",
    status: "Application available · Menu tools upcoming",
    text: "Apply with your kitchen details and understand the review state before publishing meals.",
    steps: [
      "Choose Mother entrepreneur and enter your kitchen name, cooking specialties, daily meal capacity, lunch days, and service window.",
      "Use the preview code shown on the page. No phone or email ownership is verified in this mode.",
      "Your application is saved with your kitchen capacity and lunch availability. Your account stays pending while Paustik reviews the kitchen and food-safety details.",
      "Menu editing, weekly cycles, and meal-change and cancellation rules are planned features, not live tools yet.",
    ],
  },
  {
    slug: "courier-onboarding",
    title: "Delivery agent onboarding",
    status: "Application available · Marketplace assignments upcoming",
    text: "Apply as a local courier and learn how account approval relates to the separate tracking pilot.",
    steps: [
      "Choose Delivery agent and add your contact, address, and vehicle type.",
      "Use the preview code shown on the page, then wait for Paustik approval before activation.",
      "Marketplace order assignment is still being built; the current courier account does not receive real jobs.",
      "The existing tracking pilot uses a separate, secure courier link and is not connected to marketplace orders.",
    ],
  },
  {
    slug: "delivery-tracking",
    title: "Existing delivery tracking pilot",
    status: "Separate pilot available",
    text: "Follow the operations, courier-consent, geofence, and recipient handover flow.",
    steps: [
      "Operations creates a trip with a delivery reference, courier label, destination coordinates, and radius.",
      "The courier opens a private link, agrees to location sharing, and allows browser GPS.",
      "The pilot checks accurate location fixes against the destination geofence while the courier page stays open.",
      "The recipient confirms the one-time handover code. Sharing stops and the latest point is removed.",
    ],
  },
  {
    slug: "marketplace-roadmap",
    title: "Menus, plans, policy, and payments",
    status: "Coming next",
    text: "Preview the intended meal-cycle and clear-price flow. These actions do not work in the current account app.",
    steps: [
      "Customers will browse nearby kitchens and published weekly menus with vegetarian and non-vegetarian choices.",
      "Mothers will manage dishes, portions, prices, availability, and dated weekly menu cycles.",
      "Published cancellation cutoffs and meal-change rules will be shown before checkout; Paustik has not set those terms yet.",
      "Checkout will show meal, delivery, tax, platform fee, mother earnings, refunds, and adjustments separately.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="help-shell">
      <header className="help-heading">
        <span className="eyebrow">Paustik help centre</span>
        <h1>Short guides for every role.</h1>
        <p>Short visual walkthroughs explain account setup and the separate delivery pilot. Each guide also includes written steps.</p>
      </header>
      <nav className="help-jump" aria-label="Jump to a help topic">
        {guides.map((guide) => <a key={guide.slug} href={`#${guide.slug}`}>{guide.title}</a>)}
      </nav>
      <div className="help-callout"><strong>Account setup status:</strong> preview codes are displayed in the app and do not prove phone ownership. In production, SMS and WhatsApp need Twilio Verify configured; WhatsApp also needs an enabled sender. Admin account creation is restricted to the admin panel. Menu publishing, marketplace delivery assignments, checkout, and payments are not live in this build. The separate delivery tracking pilot is available.</div>
      <section className="help-documents" aria-labelledby="help-documents-title">
        <div><span className="eyebrow">Take Paustik with you</span><h2 id="help-documents-title">Guides and project documents</h2><p>Download the current user guide or the detailed product and development specification.</p></div>
        <div className="help-document-actions"><a className="button button-small" href="/docs/Paustik_User_Guide.pdf" download>Download user guide (PDF)</a><a className="button button-small button-light" href="/docs/Paustik_Product_and_Development_Specification.pdf" download>Download product and development specification (PDF)</a></div>
      </section>
      <section className="help-grid" aria-label="Paustik video help guides">
        {guides.map((guide, index) => (
          <article className="help-card" id={guide.slug} key={guide.slug}>
            <video className="help-video" controls playsInline preload="none" poster={`/assets/help-${guide.slug}.png`} aria-label={`${guide.title} help video`}>
              <source src={`/help-videos/${guide.slug}.webm`} type="video/webm" />
              Your browser does not support this help video. Use the written steps below.
            </video>
            <div className="help-card-content">
              <div className="help-card-top"><span className="help-number">0{index + 1}</span><span className="help-status">{guide.status}</span></div>
              <h2>{guide.title}</h2>
              <p>{guide.text}</p>
              <details className="help-transcript">
                <summary>Read the video transcript</summary>
                <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              </details>
            </div>
          </article>
        ))}
      </section>
      <footer className="help-footer"><span>Need an account?</span><Link className="text-link" href="/sign-up">Create a Paustik account</Link><span aria-hidden="true">·</span><Link className="text-link" href="/sign-in">Sign in</Link></footer>
    </main>
  );
}
