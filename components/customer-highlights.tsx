"use client";
import Image from "next/image";
import Link from "next/link";
import {useUiLanguage} from "@/components/ui-language";
export function CustomerHighlights(){
 const {t}=useUiLanguage();
 return <section className="customer-highlights customer-home-hero" aria-label={t("Made for your everyday")}>
  <Image src="/assets/home-fresh.avif" alt="" fill priority sizes="(max-width:700px) 100vw, 1100px" className="customer-hero-image"/>
  <div className="highlight-content"><span className="eyebrow">{t("Made for your everyday")}</span><h2>{t("A little planning. A lot of home.")}</h2><p>{t("Choose your Mother Kitchen and plan 3–7 meal days.")}</p><Link className="button button-small" href="/customer/dashboard?mode=subscription#customer-discover">{t("Explore subscriptions")} <span aria-hidden="true">↗</span></Link></div>
 </section>;
}
