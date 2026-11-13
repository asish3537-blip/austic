import Image from "next/image";
import Link from "next/link";
import {UiText} from "@/components/ui-language";
export function CustomerSchoolHero(){
 return <section className="customer-school-hero" aria-label="ScooFoo school tiffins"><Image src="/assets/mother-child-meal.svg" alt="" fill sizes="(max-width:700px) 50vw, 500px"/><div className="school-hero-content"><span className="sf-brand">Scoo<span>Foo</span></span><h2><UiText text="Your cooking."/><br/><UiText text="Their school lunch."/></h2><p><UiText text="Pack at home. Follow pickup and school reception handover."/></p><Link className="button" href="/school-tiffins"><UiText text="Explore ScooFoo"/> <span aria-hidden="true">↗</span></Link></div></section>;
}
