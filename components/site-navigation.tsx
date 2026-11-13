"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {isSchoolRoute} from "@/lib/service-brand";
import {UiText} from "@/components/ui-language";
export function SiteNavigation({mobile=false}:{mobile?:boolean}){
 const school=isSchoolRoute(usePathname());
 if(school)return <nav className={mobile?"mobile-nav-panel":"header-nav"} aria-label={mobile?"Mobile navigation":"Main navigation"}><Link href="/school-tiffins"><UiText text="School tiffins"/></Link><Link href="/school-desk"><UiText text="School reception"/></Link><Link href="/"><UiText text="Paustik meals"/></Link><Link href="/help"><UiText text="Help"/></Link></nav>;
 return <nav className={mobile?"mobile-nav-panel":"header-nav"} aria-label={mobile?"Mobile navigation":"Main navigation"}><Link href="/#customers"><UiText text="Customers"/></Link><Link href="/#for-mothers"><UiText text="Mother Kitchens"/></Link><Link className="sf-nav-link" href="/scoofoo" aria-label="ScooFoo school tiffins"><span className="sf-nav-wordmark">Scoo<span>Foo</span></span></Link>{mobile&&<Link href="/#meal-plans"><UiText text="Meals"/></Link>}<Link href={mobile?"/install":"/#download"}><UiText text="Get the app"/></Link>{mobile&&<Link href="/help"><UiText text="Help"/></Link>}</nav>;
}
export function OpenServiceApp(){const school=isSchoolRoute(usePathname());return <Link className="button button-small" href={school?"/school-tiffins":"/app"}><UiText text={school?"Open ScooFoo":"Open app"}/></Link>;}
