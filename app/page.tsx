import Image from "next/image";
import Link from "next/link";
import { AvailabilityCheck } from "@/components/availability-check";

const journey = [
  ["01", "Explore nearby kitchens", "See verified mother-led kitchens and the meals they publish."],
  ["02", "Choose what suits you", "Compare daily meals and weekly plans, with veg and non-veg choices."],
  ["03", "A mother prepares your meal", "The kitchen prepares and packs the order to its published standards."],
  ["04", "Follow the delivery", "A local delivery partner brings the meal to your neighbourhood."],
];

const plans = [
  { name: "Everyday", note: "A meal when you need one", detail: "Flexible single-meal choices for busy days.", items: ["Veg and non-veg options planned", "Browse kitchens near you", "Clear itemized price before checkout"], featured: false },
  { name: "Weekly table", note: "A little more organised", detail: "A rotating selection for the week ahead.", items: ["Choose a weekly meal rhythm", "See each day’s menu before you join", "Pause and change rules shown up front"], featured: true },
  { name: "Family table", note: "Meals for more than one", detail: "Plan portions and preferences for your household.", items: ["Household portions", "Dietary preferences planned", "Delivery details for your area"], featured: false },
];

const principles = [
  ["Kitchen review", "Kitchen approval and food-safety review are planned before a mother can publish meals."],
  ["Clear meal details", "Menus are being designed to show ingredients, allergens and meal categories."],
  ["Published standards", "Food handling, packing and handover standards will be shared with kitchen partners."],
  ["Visible order progress", "Marketplace delivery updates will connect to orders after dispatch is built."],
  ["Clear meal rules", "Cancellation cutoffs and meal-change windows will be shown before checkout."],
  ["Itemized payments", "The checkout will show meal, delivery, tax, platform fee and refund amounts separately."],
];

export default function HomePage() {
  return (
    <main className="market-home">
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Mother-led food, rooted in your neighbourhood</div>
          <h1>Homemade care,<br /><em>delivered nearby.</em></h1>
          <p>Pausstik is building a local food marketplace where families can discover home-style meals prepared by mother entrepreneurs.</p>
          <div className="hero-actions">
            <Link className="button" href="#availability">Check your neighbourhood <span aria-hidden="true">→</span></Link>
            <Link className="button button-light" href="#how-it-works">How Pausstik works</Link>
          </div>
          <div className="hero-note"><span>✳</span> Local kitchens · Veg and non-veg menus planned · Neighbourhood delivery</div>
          <p className="launch-note">Account preview is open for early onboarding. Orders and live payments are not open yet.</p>
        </div>
        <div className="hero-art" aria-label="Pausstik mother and child illustration">
          <div className="art-halo" />
          <Image src="/assets/mother-child-meal.svg" alt="A mother and child sharing a home-style meal" width={680} height={540} priority />
          <div className="art-caption"><span className="caption-mark">✦</span><div><strong>Good food grows stronger communities</strong><small>Mother-led · Local · Made with care</small></div></div>
        </div>
      </section>

      <section className="availability-section" id="availability">
        <span className="eyebrow">Neighbourhood launch</span>
        <h2>Is Pausstik coming to your area?</h2>
        <p>We’re preparing a controlled neighbourhood pilot and will publish service areas before taking orders.</p>
        <AvailabilityCheck />
      </section>

      <section className="story-section" id="for-mothers">
        <div className="story-art">
          <div className="story-art-top"><span>PAUSTIK</span><span>LOCAL FOOD COMMUNITY</span></div>
          <Image src="/assets/mother-child-meal.svg" alt="Illustration representing a mother-led local kitchen" width={560} height={444} />
          <div className="story-art-caption">A home kitchen can grow into a neighbourhood business.</div>
        </div>
        <div className="story-copy">
          <span className="eyebrow">For mothers</span>
          <h2>Your kitchen.<br />Your skills.<br /><em>Your business.</em></h2>
          <p>Pausstik is being built to help mothers turn their cooking into a local food business, with clear onboarding, kitchen review and neighbourhood delivery support.</p>
          <ol className="mother-steps">
            <li><span>01</span><div><b>Apply to join</b><small>Share your kitchen and cooking experience.</small></div></li>
            <li><span>02</span><div><b>Review and prepare</b><small>Kitchen review and food-safety guidance are planned before launch.</small></div></li>
            <li><span>03</span><div><b>Publish your menu</b><small>Menu tools and weekly meal cycles are in the next build phase.</small></div></li>
          </ol>
          <Link className="button button-warm" href="/help#mother-onboarding">See the mother guide <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="journey-section" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">A neighbourhood food journey</span>
          <h2>From a mother’s kitchen to your table.</h2>
          <p>This is the marketplace flow Pausstik is preparing. Ordering and delivery assignments are not active yet.</p>
        </div>
        <div className="journey-grid">
          {journey.map(([number, title, detail]) => (
            <article className="journey-card" key={number}>
              <span className="journey-number">{number}</span><span className="journey-mark" aria-hidden="true">{number === "01" ? "⌖" : number === "02" ? "☼" : number === "03" ? "♨" : "→"}</span>
              <h3>{title}</h3><p>{detail}</p><small>PLANNED FOR PILOT</small>
            </article>
          ))}
        </div>
      </section>

      <section className="plans-section" id="meal-plans">
        <span className="anchor-alias" id="pricing" aria-hidden="true" />
        <div className="section-heading">
          <span className="eyebrow">Meal plans</span>
          <h2>Good food, with a rhythm that fits.</h2>
          <p>Plan formats are being designed now. Prices and final meal rules will be published before ordering opens.</p>
        </div>
        <div className="plans-grid">
          {plans.map((plan) => (
            <article className={`plan-card${plan.featured ? " plan-card-featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="plan-badge">A flexible option</span>}
              <span className="plan-status">PLANNED</span><h3>{plan.name}</h3><p className="plan-note">{plan.note}</p>
              <p className="plan-price">Pricing <small>announced before launch</small></p>
              <p className="plan-detail">{plan.detail}</p>
              <ul>{plan.items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
              <Link className="button plan-button" href="/help#marketplace-roadmap">View launch roadmap</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="trust-section" id="trust">
        <div className="section-heading">
          <span className="eyebrow">Trust and safety</span>
          <h2>Trust belongs in every step.</h2>
          <p>These are the safeguards Pausstik is designing into the marketplace. They are not yet active operating services.</p>
        </div>
        <div className="principles-grid">
          {principles.map(([title, detail], index) => (
            <article className="principle-card" key={title}>
              <span className="principle-icon" aria-hidden="true">{["✓", "✧", "♢", "⌖", "↻", "₹"][index]}</span>
              <h3>{title}</h3><p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <div><span className="eyebrow">A healthier neighbourhood, one meal at a time</span><h2>Good food grows stronger communities.</h2><p>Explore the account and delivery pilot guides while Pausstik prepares its first marketplace launch.</p></div>
        <Link className="button button-warm" href="/help">Explore Pausstik guides <span aria-hidden="true">→</span></Link>
      </section>
      <p className="demo-link"><Link href="/legacy-demo.html">Explore the previous interactive concept demo</Link></p>
    </main>
  );
}
