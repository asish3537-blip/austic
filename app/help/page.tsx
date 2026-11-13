import { UiText } from "@/components/ui-language";
import Link from "next/link";
import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";

const guides = [
 {slug:"scoofoo",title:"ScooFoo · school tiffin delivery",status:"Separate home-to-school pilot",text:"Parents prepare food at home. ScooFoo arranges pickup and handover to an authorised school receiving adult.",steps:["Open ScooFoo from the app highlights or profile. Choose the school, saved home pickup address, tiffin label, class and school dates. Requests need school and route confirmation; no payment is collected in this pilot.","School operations verifies permission, the reception point and the receiving account. It confirms requests and assigns a dedicated courier. Mark the packed tiffin ready on the school day, then share the private pickup code at home handover.","Follow pickup and school arrival in ScooFoo. Only the linked reception desk or an audited operations receipt can complete delivery; couriers cannot self-confirm. School reception receipt does not confirm the child has eaten. Late arrivals alert the guardian and operations; exceptions need an adult-confirmed safe return or school receipt.","The Kesura, Bhubaneswar pilot uses a 12:00 reception target for 12:30 lunch. Actual gate, receiving contact, school calendar and route must be approved before dispatch. Empty-box return is not included."]},
 {slug:"ordering-policies",title:"Ordering, delivery and cancellation",status:"Pilot ordering rules",text:"Review your meal, delivery quote, coupon and wallet credit before confirming.",steps:["Subscriptions require 3–7 different days. One-time specials can be booked for a single published date. Homemade products use a kitchen/customer delivery-time agreement before checkout.","New local orders need an online eligible courier. Bulk bookings use a separately agreed vehicle and quote. Courier batches allow up to three compatible orders, within carrying capacity.","Cancel eligible unprepared meals at least five hours before delivery. Paid value less the ₹5 customer-cancellation fee returns to wallet. An active order one hour past scheduled delivery is cancelled by server cleanup and paid value returns to wallet without a fee.","Delivery codes appear in your order tracking after pickup. Share only on arrival. GPS is optional for customer handover. Enable device push in Settings for updates.","One coupon is allowed per checkout. Discounts are allocated across subscription days. Cancelled bookings retain the coupon-use record. Bank payouts and payment confirmations follow their separately configured provider status."]},
 {slug:"account-profile",title:"Your profile, settings and order history",status:"Photo, language and device push",text:"Tap your profile beside the Paustik logo to open your personal menu.",steps:["Open My profile to upload, replace or remove your photo and save your name. Email and phone are read-only; this screen does not change your role or sign-in identity.","Settings links to Orders & history, Wallet, language, help, delivery location and password reset. Your personal photo is visible in your own account; kitchen listing photos are managed separately by the mother.","Open Push notifications in Settings to enable device push when supported. Permission is requested only after you press Enable device push. Notification inbox remains available without device permission.","Discover starts with highlights and three choices: subscriptions, one-time meals and homemade products. Search or filter nearby kitchens; your recent orders follow discovery. Open Orders for full tracking, feedback, cancellation and history."]},
  { slug: "notifications-and-maps", title: "Notifications and Google Maps", status: "In-app updates and map controls", text: "Open Notifications for your account updates and device push settings.", steps: ["Enable device push only if you want browser notifications. Approve the browser prompt; no permission is requested automatically. Live push needs server signing keys.", "Use Turn off device push to opt out. Signing out stops future dispatch for that session. Lock-screen alerts hide private order details.", "Kitchen profiles, admin map points and fresh courier tracking include Google Maps controls. Tapping them sends the selected coordinates to Google Maps; the app does not load a Google map automatically.", "Browser/PWA push support varies by device. On iPhone/iPad open the installed Home Screen app. Native Android background push needs separate Firebase configuration."] },
  {
    slug: "account-setup",
    title: "Create an account with email",
    status: "Email/password sign-in and email recovery",
    text: "Choose your role, register with email/password and confirm your email. WhatsApp is a free support chat link.",
    steps: [
      "Select Customer, Mother entrepreneur, or Delivery agent on the sign-up page.",
      "Enter your name, email, contact number and a password of at least eight characters.",
      "WhatsApp support opens a conversation that you send yourself. This zero-cost setup does not provide automated SMS or WhatsApp verification.",
      "Confirm your email using the link in your inbox, then sign in with your email/password. Use Forgot password for email recovery.",
      "Mother and courier accounts wait for Paustik approval; active customers open their workspace.",
      "Admin accounts are not available on public sign-up. An active admin creates them in the admin panel.",
    ],
  },
  {
    slug: "customer-workspace",
    title: "Customer workspace and ordering",
    status: "Kitchen discovery, daily menus and one-week subscriptions · online payment pending",
    text: "Choose a nearby mother-led kitchen, open its daily menu, then build a 3–7-day subscription with a clear price breakdown.",
    steps: [
      "Create a Customer account, confirm your email and sign in with email/password.",
      "Your home starts with highlights, ordering choices and nearby kitchens. Recent orders appear below discovery. Open Orders from the bottom navigation or your profile menu for full order history, plans, tracking and cancellations.",
      "Use my location to save your drop-off pin. Paustik uses it to calculate nearby kitchens and shares it with the assigned courier for an order.",
      "Switch between the compact kitchen list and grid. Photos or logos help identify the mother. Search by a mother’s name, cuisine or dish, filter vegetarian or non-vegetarian menus, and save favourite kitchens. With a delivery pin, the list shows kitchens whose 25 km service area reaches you.",
      "Open View menu on a kitchen to see that mother’s dated menu, three meal components, price, delivery time and available servings. Choose a date to browse its meals. Sample kitchens are labelled and cannot create real orders.",
      "Select Build my subscription. Choose 3–7 days, one meal per day and your number of servings. The 3, 5, 6 and 7-day shortcuts select the first available days; review or change each meal before reserving. Meals and ₹30-per-day delivery are itemised in the summary. Plans cover one week and renew manually.",
      "For a single meal, press Order meal on the dish. New meal, subscription and product purchases open the dedicated Orders page. Google Maps controls share selected coordinates only when opened.",
      "Online checkout is not connected. No payment is taken here; use the pilot collection process with Paustik admin if a payment is collected outside the app.",
      "Cancel a meal day at least five hours before its scheduled delivery. The eligible amount already paid, minus the ₹5 processing fee, is credited to your Paustik wallet. No credit is issued for an unpaid amount.",
      "Track kitchen and courier status in Your orders & tracking. A current courier point appears after pickup when the courier has opted in to GPS sharing.",
    ],
  },
  {
    slug: "mother-onboarding",
    title: "Mother entrepreneur onboarding",
    status: "Kitchen application, weekly menu and order queue available",
    text: "After Paustik approval, save your kitchen pin, use the 25 km customer delivery area, publish dated three-part meals, and prepare customer orders.",
    steps: [
      "In Your kitchen, use Your kitchen identity to upload a profile photo or kitchen logo. Choose PNG, JPG or WebP under 5 MB. The saved image is public on your kitchen listing; you can replace or remove it at any time.",
      "Choose Mother entrepreneur and enter your kitchen name, cooking specialties, daily meal capacity, lunch days, and service window.",
      "Create your email/password account and confirm your email using the inbox link.",
      "Your application stays pending until an administrator reviews and approves it in the operations dashboard.",
      "In your Mother workspace, allow location access while at your kitchen to save the pickup pin. Customer delivery is available within 25 km. Courier pickup/drop-off geofences remain 150 m.",
      "Add meals by date with tier, exactly three meal components, delivery time, ingredients, allergens and servings. Starting prices are ₹69 base, ₹79 egg, ₹89 cheese and ₹99 chicken; chicken cannot exceed ₹100.",
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
      "Start location sharing when you are ready. Paustik stores one latest point, checks GPS accuracy and speed, and verifies pickup/drop-off within 150 m of the saved pins.",
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
      "The assigned customer sees the courier's current point while the order is in transit. Paustik stores no route history and clears the point at delivery or when the courier stops sharing.",
    ],
  },
  {
    slug: "marketplace-roadmap",
    title: "Homemade products and delivery-time agreements",
    audience: "Customers, mothers and admin",
    status: "Product requests and agreed-time checkout",
    text: "Sell or request sattu, sweets, pickles and other homemade food in the new Marketplace section.",
    steps: ["Mothers open Marketplace, add a product, pack size, price, units, minimum quantity, ingredients, allergens, preparation and storage/shelf-life details. Ready batches need an expiry.","Customers with a delivery pin see nearby available products. Request a delivery date/time in IST; no stock or payment is taken yet.","The mother accepts or proposes a time. The customer can counter-propose. After the kitchen agrees, the customer confirms checkout within 30 minutes. Shared orders, wallet, kitchen status, courier handover, tracking and feedback then apply.","For meals, select breakfast, lunch or light dinner. Use Order meal for a single serving day, or create a 3–7-day subscription for one meal period. Separate plans cover other periods.","Dinner and all local deliveries end at 9 p.m. IST. New pickups close at 8:30 p.m. Eligible unprepared cancellations release capacity; prepared or returned food is not automatically relisted."]
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
      <section className="help-callout" id="voice-and-whatsapp"><h2>Talk to Paustik</h2><p>Open Paustik help, tap Talk to Paustik, and ask an English question. Review the transcript, then Send. Tap Read reply aloud to hear the answer. Voice works on supported browsers, starts only on request and may use your browser’s online speech service. Free guided help needs no AI subscription; typing is always available.</p><a className="button button-small" href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Chat on WhatsApp ↗</a><p>WhatsApp opens a support chat; it does not send OTPs or automatic delivery messages. Email sign-in and app/push order updates remain available.</p></section><nav className="help-jump" aria-label="Jump to a help topic">
        <a href="#install-app">Install the app</a>
        <a href="#admin-authenticator">Administrator sign-in</a>
        {guides.map((guide) => <a key={guide.slug} href={`#${guide.slug}`}>{guide.title}</a>)}
      </nav>
      <div className="help-callout"><strong>Live pilot status:</strong> approved mothers can publish breakfast, lunch and light dinner menus plus homemade products; customers can reserve one week (3–7 days), cancel eligible days to receive wallet credits, and see nearby kitchens using opted-in pins. Order updates appear in the app; enable supported device push in Settings. Email delivery uses the configured sender. WhatsApp support is manual chat, not automatic messaging. Admin records only confirmed external payment receipts. Admin accounts are created in the admin panel.</div>
      <section className="help-documents" aria-labelledby="help-documents-title">
        <div><span className="eyebrow">Take Paustik with you</span><h2 id="help-documents-title">Guides and project documents</h2><p>Download the current user guide or the detailed product and development specification.</p></div>
        <div className="help-document-actions"><a className="button button-small" href="/docs/Paustik_Marketplace_Pilot_Guide_QA.pdf" download>Marketplace, meals &amp; QA guide (PDF)</a><a className="button button-small" href="/docs/Paustik_Authenticator_and_Kitchen_Guide.pdf" download>New kitchen &amp; sign-in guide (PDF)</a><a className="button button-small button-light" href="/docs/Paustik_User_Guide.pdf" download>Full pilot guide (PDF)</a><a className="button button-small button-light" href="/docs/Paustik_Product_and_Development_Specification.pdf" download>Product and development specification (PDF)</a></div>
      </section>
      <section className="help-callout" id="install-app" aria-labelledby="install-app-title">
        <span className="eyebrow">Paustik on your home screen</span>
        <h2 id="install-app-title">Install directly from this website</h2>
        <p>Open the installation page on your phone and follow the steps for your device. Installation is free; meals and delivery are charged according to your selected plan.</p>
        <ol>
          <li><strong>Android:</strong> open the installation page in Chrome and tap Install. If no prompt appears, use the browser menu and choose Install app or Add to Home screen.</li>
          <li><strong>iPhone or iPad:</strong> open the page in Safari, tap Share, then Add to Home Screen. Keep Open as Web App enabled if offered and tap Add.</li>
          <li><strong>Computer:</strong> use the installation button in Chrome or Edge. If installation is unavailable, Open app works in your browser.</li>
          <li>Open the Paustik icon and sign in with your existing account. Your role determines your workspace; administrator sign-in stays separate.</li>
        </ol>
        <p>An internet connection is required for sign-in, menus, orders, payments and delivery tracking. Keep the courier app open while sharing location. The sample preview does not create real orders or take payments. Removing the installed app does not cancel your account or subscriptions.</p>
        <div className="install-help-actions"><Link className="button button-small" href="/install">Installation guide</Link><Link className="button button-small button-light" href="/app"><UiText text="Open app"/></Link><Link className="text-link" href="/">Go to website</Link></div>
      </section>
      <section className="help-callout" id="admin-authenticator" aria-labelledby="admin-authenticator-title">
        <h2 id="admin-authenticator-title">Administrator sign-in with an authenticator</h2>
        <p>First create the owner account using the private one-time setup code. Existing administrators can sign in and open Admin security.</p>
        <ol><li>Enter your password in Admin security, then scan the QR code with your authenticator app or copy the manual key.</li><li>Enter the six-digit code from the app to finish linking it. Save the recovery codes shown once.</li><li>Next time, sign in with your username, password and authenticator code. A saved recovery code can be used once if you lose your phone.</li></ol>
        <p>Authenticator protection applies to administrators only. Password reset keeps it enabled. Customer, mother and delivery accounts use email/password and email confirmation. WhatsApp is a support chat option.</p>
        <Link className="text-link" href="/admin-sign-in">Administrator sign-in</Link><span aria-hidden="true"> · </span><Link className="text-link" href="/admin/security">Admin security</Link>
      </section>
      <section className="help-grid" aria-label="Paustik video help guides">
        {guides.map((guide, index) => (
          <article className="help-card" id={guide.slug} key={guide.slug}>
            {!["marketplace-roadmap","customer-workspace","account-profile"].includes(guide.slug) && <video className="help-video" controls playsInline preload="none" poster={`/assets/help-${guide.slug}.png`} aria-label={`${guide.title} help video`}>
              <source src={`/help-videos/${guide.slug}.webm`} type="video/webm" />
              Your browser does not support this help video. Use the written steps below.
            </video>}
            <div className="help-card-content">
              <div className="help-card-top"><span className="help-number">0{index + 1}</span><span className="help-status">{guide.status}</span></div>
              <h2>{guide.title}</h2>
              <p>{guide.text}</p>
              <details className="help-transcript">
                <summary>{["marketplace-roadmap","customer-workspace","account-profile"].includes(guide.slug) ? "Read the current steps" : "Read the video transcript"}</summary>
                <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              </details>
            </div>
          </article>
        ))}
      </section>
      <footer className="help-footer"><span>Need an account?</span><Link className="text-link" href="/sign-up">Create a Paustik account</Link><span aria-hidden="true">·</span><Link className="text-link" href="/sign-in"><UiText text="Sign in"/></Link></footer>
    </main>
  );
}
