import Image from "next/image";
import Link from "next/link";

const features = [
  ["01", "Mother-led kitchens", "Meet the mothers cooking in your neighbourhood."],
  ["02", "A week, your way", "Choose a kitchen and reserve 3–7 meal days."],
  ["03", "Follow your lunch", "See preparation, pickup and delivery updates."],
];

export default function HomePage() {
  return <main className="public-home">
    <section className="public-hero">
      <div className="public-hero-copy"><span className="eyebrow">From her kitchen. To your table.</span>
        <h1>A little taste<br />of <em>home.</em></h1>
        <p>Fresh lunches from mothers in your neighbourhood. Choose your kitchen. Make the week yours.</p>
        <div className="hero-actions"><Link className="button" href="/app">Find your kitchen →</Link><a className="button button-light" href="/downloads/Pausstik-1.2.0.apk" download>Get the Android app</a></div>
        <div className="hero-mini-note">Meals from ₹69 <span aria-hidden="true">·</span> Veg &amp; non-veg</div>
      </div>
      <div className="public-hero-picture"><Image src="/assets/neighbourhood-lunch.svg" alt="Illustration of a home-style lunch with rice, dal, vegetables and salad" width={800} height={640} priority /><div className="hero-picture-note"><span>♨</span><div><strong>Good food, closer.</strong><small>Home-style meals. Local kitchens.</small></div></div></div>
    </section>
    <section className="public-features" aria-label="Why Pausstik">{features.map(([number,title,detail])=><article key={number}><span>{number}</span><h2>{title}</h2><p>{detail}</p></article>)}</section>
    <section className="public-prices" id="meal-plans"><div><span className="eyebrow">Everyday meals</span><h2>Simple choices.<br />Clear prices.</h2><p>Three components per meal. Delivery ₹30 per order.</p></div><ul>{[["Base","69"],["Egg","79"],["Cheese","89"],["Chicken","99"]].map(([name,price])=><li key={name}><span>{name} meal</span><strong>from ₹{price}</strong></li>)}</ul></section>
    <section className="public-partner" id="for-mothers"><div><h2>Your kitchen. A new beginning.</h2><p>Bring your cooking to your neighbourhood.</p></div><Link className="button button-light" href="/sign-up?role=MOTHER">Become a kitchen partner →</Link></section>
  </main>;
}

