"use client";
import {HeroFoodVideo} from "@/components/hero-food-video";
import Link from "next/link";
import {useUiLanguage} from "@/components/ui-language";
export function CustomerHighlights(){
 const {t}=useUiLanguage();
 return <section className="customer-highlights customer-home-hero" aria-label={t("Made for your everyday")}>
  <HeroFoodVideo/>
  <div className="highlight-content"><span className="eyebrow">{t("Made for your everyday")}</span><h2>{t("A little planning. A lot of home.")}</h2><p>{t("Choose your Mother Kitchen and plan 3–7 meal days.")}</p><Link className="button button-small" href="/customer/dashboard?mode=subscription#customer-discover">{t("Explore subscriptions")} <span aria-hidden="true">↗</span></Link></div>
 </section>;
}
