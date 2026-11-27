import Image from "next/image";
import Link from "next/link";
import {UiText} from "@/components/ui-language";
import {PILOT_KITCHENS,publicPilotEnabled} from "@/lib/pilot-catalog";
export function PilotCatalogSection(){
 if(!publicPilotEnabled())return null;
 return <section className="pilot-catalog-section eh-container" aria-labelledby="pilot-catalog-heading">
  <header><span className="eyebrow"><UiText text="Pilot testing"/></span><h2 id="pilot-catalog-heading"><UiText text="Explore practice kitchens"/></h2><p><UiText text="Fictional kitchens for testing. Razorpay Test checkout only. No money taken and no food delivered. Real kitchen orders use their normal checkout."/></p></header>
  <div className="pilot-kitchen-grid">{PILOT_KITCHENS.slice(0,5).map(k=><article key={k.id}>
   <Link className="pilot-kitchen-photo" href={"/pilot?kitchen="+k.id}><Image src={k.image} alt="Illustrative meal photograph" fill sizes="(max-width:700px) 45vw,240px"/><span><UiText text="Sample · Test checkout"/></span></Link>
   <div><h3>{k.area} · <UiText text="Practice kitchen"/></h3><p>Bhubaneswar · <UiText text="Illustrative menu"/></p><small>{k.meals[0].name} · ₹{k.meals[0].price}</small><Link className="pilot-card-action" href={"/pilot?kitchen="+k.id}><UiText text="Try sample menu"/> →</Link></div>
  </article>)}</div><Link className="pilot-card-action pilot-view-all" href="/pilot"><UiText text="See all practice kitchens"/> →</Link><p className="pilot-catalog-note"><UiText text="These are examples, not verified businesses, reviews or food offers. Actual kitchens are listed separately."/> <a href="/assets/pilot-photo-credits.json" target="_blank" rel="noopener noreferrer"><UiText text="Photo credits"/></a></p>
 </section>;
}
