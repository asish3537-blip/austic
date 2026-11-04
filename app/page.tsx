import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return <main className="public-home">
    <section className="public-hero">
      <div><span className="eyebrow">Neighbourhood kitchens</span>
        <h1>Home-cooked lunch,<br /><em>close to home.</em></h1>
        <p>Choose a local mother’s kitchen and plan your lunches for the week.</p>
        <div className="hero-actions"><Link className="button" href="/app">Explore kitchens →</Link><Link className="text-link" href="/install">Get the app</Link></div>
      </div>
      <Image src="/assets/mother-child-meal.svg" alt="Mother and child sharing lunch" width={560} height={444} priority />
    </section>
    <section className="public-prices" id="meal-plans"><div><span className="eyebrow">On the menu</span><h2>Lunch from ₹69</h2><p>Choose 3–7 days. Delivery is ₹30 per order.</p></div>
      <ul>{[["Base","69"],["Egg","79"],["Cheese","89"],["Chicken","99"]].map(([name,price])=><li key={name}><span>{name} meal</span><strong>from ₹{price}</strong></li>)}</ul>
    </section>
    <section className="public-partner" id="for-mothers"><div><h2>Cook for your neighbourhood.</h2><p>Share your menu and set your kitchen’s daily capacity.</p></div><Link className="button button-light" href="/sign-up?role=MOTHER">Join as a mother</Link></section>
  </main>;
}
