import Link from "next/link";

const guides = [
  {
    slug: "account-setup",
    title: "Create an account with SMS or WhatsApp",
    status: "Available · real delivery needs provider credentials",
    text: "Choose a role and sign in. Twilio Verify sends real SMS or WhatsApp codes when its production credentials are configured.",
    steps: [
      "Select Customer, Mother entrepreneur, or Delivery agent on the sign-up page.",
      "Choose SMS or WhatsApp, enter your number, and request a 6-digit code. Local or explicitly enabled preview mode may show a code on the page; this does not verify phone ownership.",
      "Production SMS and WhatsApp codes need Twilio Verify credentials in Vercel. WhatsApp also needs a Twilio Verify service with an approved WhatsApp sender.",
      "Enter the code delivered by your selected method. Account confirmation email is sent separately when Resend is configured.",
      "Mother and courier accounts wait for Pausstik approval; active customers open their workspace.",
      "Admin accounts are not available on public sign-up. An active admin creates them in the admin panel.",
    ],
  },
  {
    slug: "customer-workspace",
    title: "Customer workspace and ordering",
    status: "Nearby menus and order records available · online payment pending",
    text: "Set a delivery pin, browse approved kitchens in your city, and place an order from a published weekly menu.",
    steps: [
      "Create a Customer account with the preview code, then sign in with another on-page code.",
      "Use my location to save your drop-off pin. Pausstik shares it only with the courier assigned to your order.",
      "Browse vegetarian, non-vegetarian and vegan meals from approved kitchens serving your city. Menu cards show serving date, remaining portions and price.",
      "Choose servings and place an order. The current delivery fee is ₹30 and is shown separately; online payment is not connected and no charge is taken.",
      "Track kitchen and courier status in Recent orders. A current courier point appears after pickup when the courier has opted in to GPS sharing.",
    ],
  },
  {
    slug: "mother-onboarding",
    title: "Mother entrepreneur onboarding",
    status: "Kitchen application, weekly menu and order queue available",
    text: "After Pausstik approval, save your kitchen pin, manage dated meals and prepare customer orders.",
    steps: [
      "Choose Mother entrepreneur and enter your kitchen name, cooking specialties, daily meal capacity, lunch days, and service window.",
      "Use the preview code shown on the page. No phone or email ownership is verified in this mode.",
      "Your application stays pending until an administrator reviews and approves it in the operations dashboard.",
      "In your Mother workspace, allow location access while at your kitchen to save the pickup pin. Couriers use it for the 150 m pickup geofence.",
      "Add meals by date with category, description, ingredients, allergens, price and servings, then publish the weekly menu.",
      "Accept or decline incoming orders, start preparation, and mark a packed order ready for a courier. Recorded earnings are shown separately from unpaid online orders.",
    ],
  },
  {
    slug: "courier-onboarding",
    title: "Delivery agent onboarding",
    status: "Courier approval, job claims and GPS tracking available",
    text: "Approved delivery partners can claim a ready order, move it through pickup and handover, and share GPS only by consent.",
    steps: [
      "Choose Delivery agent and add your contact, address, and vehicle type.",
      "Wait for an administrator to approve your partner application.",
      "Claim a ready delivery. Exact customer address details appear after you accept the job.",
      "Start location sharing when you are ready. Pausstik stores one latest point, checks GPS accuracy and speed, and verifies pickup/drop-off within 150 m of the saved pins.",
      "Move through pickup, out-for-delivery and delivered in order. GPS location is cleared after handover or when you revoke sharing; a daily cleanup removes stale points.",
    ],
  },
  {
    slug: "delivery-tracking",
    title: "Marketplace delivery tracking",
    status: "Connected to marketplace order flow",
    text: "Follow the kitchen-to-courier handoff with consent-based GPS and order-linked geofence checks.",
    steps: [
      "A delivery task is created when the mother marks an order ready for pickup.",
      "An approved courier claims the task. The customer address is only revealed to that assigned courier.",
      "The courier chooses Start location sharing and allows browser GPS. A fresh accurate point is needed to confirm pickup and delivery inside the 150 m geofences.",
      "The assigned customer sees the courier's current point while the order is in transit. Pausstik stores no route history and clears the point at delivery or when the courier stops sharing.",
    ],
  },
  {
    slug: "marketplace-roadmap",
    title: "Order pricing, plans and payments",
    status: "Order flow works · payment provider pending",
    text: "Understand the current one-time meal checkout and which payment features still need provider setup.",
    steps: [
      "A placed order saves the menu price and a ₹30 delivery fee. The app shows that payment is pending and does not charge the customer.",
      "The admin dashboard reports captured payments and ledger income only. It does not count unpaid orders as revenue.",
      "Meal-plan subscriptions, vouchers, refunds, online payment and partner payouts still need their product rules and payment-provider connection.",
      "Account verification by real email and WhatsApp/SMS depends on configured Resend and Twilio credentials. Preview codes do not verify contact ownership.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="help-shell">
      <header className="help-heading">
        <span className="eyebrow">Pausstik help centre</span>
        <h1>Short guides for every role.</h1>
        <p>Short visual walkthroughs explain account setup and the separate delivery pilot. Each guide also includes written steps.</p>
      </header>
      <nav className="help-jump" aria-label="Jump to a help topic">
        {guides.map((guide) => <a key={guide.slug} href={`#${guide.slug}`}>{guide.title}</a>)}
      </nav>
      <div className="help-callout"><strong>Live service status:</strong> the marketplace supports approval-based partner onboarding, dated menus, orders, courier claims and opt-in GPS tracking. Online payments, vouchers, meal-plan billing and real email/SMS/WhatsApp delivery still require provider setup. Admin accounts are created in the admin panel.</div>
      <section className="help-documents" aria-labelledby="help-documents-title">
        <div><span className="eyebrow">Take Pausstik with you</span><h2 id="help-documents-title">Guides and project documents</h2><p>Download the current user guide or the detailed product and development specification.</p></div>
        <div className="help-document-actions"><a className="button button-small" href="/docs/Pausstik_User_Guide.pdf" download>Download user guide (PDF)</a><a className="button button-small button-light" href="/docs/Pausstik_Product_and_Development_Specification.pdf" download>Download product and development specification (PDF)</a></div>
      </section>
      <section className="help-grid" aria-label="Pausstik video help guides">
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
      <footer className="help-footer"><span>Need an account?</span><Link className="text-link" href="/sign-up">Create a Pausstik account</Link><span aria-hidden="true">·</span><Link className="text-link" href="/sign-in">Sign in</Link></footer>
    </main>
  );
}
