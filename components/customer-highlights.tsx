"use client";
import {HeroFoodVideo} from "@/components/hero-food-video";
import Link from "next/link";
import {useUiLanguage} from "@/components/ui-language";
export function CustomerHighlights({mode="all"}:{mode?:string}){
 const {t}=useUiLanguage();
 return <section className="customer-highlights customer-home-hero" aria-label={t("Made for your everyday")}>
  <HeroFoodVideo/>
  <div className="highlight-content"><span className="eyebrow">{t("Made for your everyday")}</span><h2>{t("A little planning. A lot of home.")}</h2><p>{t("Choose a meal plan, a one-time meal or homemade favourites.")}</p><nav className="customer-hero-actions" aria-label={t("Choose how to order")}><Link href="/customer/dashboard?mode=subscription#customer-discover" aria-current={mode==="subscription"?"page":undefined}>{t("Meal subscriptions")}</Link><Link href="/customer/dashboard?mode=once#customer-discover" aria-current={mode==="once"?"page":undefined}>{t("One-time meals")}</Link><Link href="/customer/marketplace">{t("Homemade products")}</Link></nav></div>
 </section>;
}
