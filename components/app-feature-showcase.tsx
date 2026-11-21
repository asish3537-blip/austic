import {AppIcon} from "@/components/app-icon";
import { BrandWordmark } from "@/components/brand-wordmark";
import { UiText } from "@/components/ui-language";
import Image from "next/image";
import Link from "next/link";
const features = [
  { icon: "menu", title: "Meal subscriptions", href: "/customer/dashboard?mode=subscription" },
  { icon: "meal", title: "One-time specials", href: "/customer/dashboard?mode=once" },
  { icon: "people", title: "Mother Kitchens", href: "/app" },
  { icon: "shop", title: "Homemade products", href: "/customer/marketplace" },
  { icon: "pay", title: "Offers & wallet", href: "/customer/wallet" },
  { icon: "route", title: "Order tracking", href: "/customer/orders" },
 ] as const;
export function AppFeatureShowcase() {
  return <section className="app-feature-showcase eh-container"><span className="eh-eyebrow"><UiText text="Made for the way you eat"/></span><h2><UiText text="What’s waiting for you"/><br /><UiText text="on the Paustik app?"/></h2><p><UiText text="Everyday meals, occasional cravings and homemade favourites, all close to home."/></p><div className="feature-phone-layout"><div className="feature-side">{features.slice(0, 3).map(feature => <Link href={feature.href} key={feature.title}><span aria-hidden="true"><AppIcon name={feature.icon}/></span><strong><UiText text={feature.title}/></strong></Link>)}</div><div className="feature-phone"><BrandWordmark width={150} height={72}/><h3><UiText text="A little home."/><br /><UiText text="Any day you choose."/></h3><Image className="feature-phone-food" src="/assets/home-thali.avif" alt="Home-style meal inspiration" width={260} height={200} /><Link href="/app" className="button"><UiText text="Find your next meal →"/></Link><small><UiText text="Illustrative app preview"/></small></div><div className="feature-side">{features.slice(3).map(feature => <Link href={feature.href} key={feature.title}><span aria-hidden="true"><AppIcon name={feature.icon}/></span><strong><UiText text={feature.title}/></strong></Link>)}</div></div></section>;
}
