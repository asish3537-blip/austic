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
  { name: "Base meal", note: "A balanced everyday lunch", price: "₹69", detail: "Choose three components from the mother’s published meal.", items: ["Three meal components", "Mother sets each day’s menu", "₹30 delivery per order"], featured: false },
  { name: "Egg meal", note: "An egg-based lunch box", price: "₹79", detail: "A three-part lunch with an egg component.", items: ["Three meal components", "Vegetarian and non-vegetarian labels", "₹30 delivery per order"], featured: false },
  { name: "Cheese meal", note: "A richer vegetarian choice", price: "₹89", detail: "A three-part meal with a cheese component.", items: ["Three meal components", "Ingredients and allergens listed", "₹30 delivery per order"], featured: true },
  { name: "Chicken meal", note: "A hearty non-vegetarian lunch", price: "₹99", detail: "A three-part meal. Mother-selected price cannot exceed ₹100.", items: ["Three meal components", "Chicken meal capped at ₹100", "₹30 delivery per order"], featured: false },
];

const principles = [
  ["Kitchen review", "Only approved mother-led kitchens with saved pickup pins appear as live kitchens."],
  ["Clear meal details", "Mother menus show meal tier, three components, serving date and delivery time."],
  ["Neighbourhood coverage", "Customers see kitchens inside the selected 5–10 km service area."],
  ["Visible order progress", "Order status, courier assignment and consent-based GPS updates are linked to the order."],
  ["Flexible meal days", "Skip one day up to five hours before delivery; eligible paid value less ₹5 goes to wallet."],
  ["Honest payment records", "Online checkout is not connected. The pilot never claims an uncollected payment."],
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
          <p className="launch-note">Pilot ordering is open for approved kitchens. Online checkout is not connected, so no payment is taken here.</p>
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
        <p>Check nearby kitchens and their current menu. Mothers serve within a selected 5–10 km delivery area.</p>
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
            <li><span>03</span><div><b>Publish your menu</b><small>Add three-part meals by day, set the delivery time and choose a price tier.</small></div></li>
          </ol>
          <Link className="button button-warm" href="/help#mother-onboarding">See the mother guide <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="journey-section" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">A neighbourhood food journey</span>
          <h2>From a mother’s kitchen to your table.</h2>
          <p>Choose a mother, reserve the days you need, and follow the order through preparation and delivery.</p>
        </div>
        <div className="journey-grid">
          {journey.map(([number, title, detail]) => (
            <article className="journey-card" key={number}>
              <span className="journey-number">{number}</span><span className="journey-mark" aria-hidden="true">{number === "01" ? "⌖" : number === "02" ? "☼" : number === "03" ? "♨" : "→"}</span>
              <h3>{title}</h3><p>{detail}</p><small>PAUSSTIK PILOT</small>
            </article>
          ))}
        </div>
      </section>

      <section className="plans-section" id="meal-plans">
        <span className="anchor-alias" id="pricing" aria-hidden="true" />
        <div className="section-heading">
          <span className="eyebrow">Meal price guide</span>
          <h2>Three components. Clear prices.</h2>
          <p>Mother-published meals start at ₹69, ₹79, ₹89 and ₹99. Choose any 3–7 days with one mother for a one-week reservation; renew manually. Cancel a meal day at least five hours before delivery and eligible collected value less a ₹5 processing fee returns to your wallet.</p>
        </div>
        <div className="plans-grid">
          {plans.map((plan) => (
            <article className={`plan-card${plan.featured ? " plan-card-featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="plan-badge">Neighbourhood favourite</span>}
              <span className="plan-status">PER MEAL</span><h3>{plan.name}</h3><p className="plan-note">{plan.note}</p>
              <p className="plan-price">{plan.price}<small>starting price · per serving</small></p>
              <p className="plan-detail">{plan.detail}</p>
              <ul>{plan.items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
              <Link className="button plan-button" href="/sign-up">Find a nearby mother</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="trust-section" id="trust">
        <div className="section-heading">
          <span className="eyebrow">Trust and safety</span>
          <h2>Trust belongs in every step.</h2>
          <p>These pilot controls keep kitchen discovery, delivery coverage and payment status visible.</p>
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
