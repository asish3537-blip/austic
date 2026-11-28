"use client";

import {MealDetails} from "@/components/meal-details";
import {useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {AppIcon} from "@/components/app-icon";
import {SupportLinks} from "@/components/support-links";
import {useUiLanguage} from "@/components/ui-language";
import {kitchenMoney,kitchenMenuDate} from "@/lib/customer-kitchen-types";
import {signInLink} from "@/lib/kitchen-handoff";
import type {loadKitchenDirectory} from "@/lib/customer-kitchens";

type Directory=Awaited<ReturnType<typeof loadKitchenDirectory>>;

export function PublicKitchenBrowser({kitchens,city,available,practiceEnabled,accountHome,customer=false}:{kitchens:Directory;city:string;available:boolean;practiceEnabled:boolean;accountHome?:string;customer?:boolean}){
 const {t,locale}=useUiLanguage();
 const [query,setQuery]=useState("");
 const [vegetarian,setVegetarian]=useState(false);
 const filtered=kitchens.filter(k=>[k.name,k.locality,k.cuisine,...k.meals.map(m=>m.name)].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&(!vegetarian||k.meals.some(m=>m.category!=="NON_VEGETARIAN")));
 return <main className="browse-app">
  <header className="browse-intro"><div><span className="browse-kicker">{t("Your neighbourhood table")}</span><h1>{t("Good food, close to home.")}</h1><p>{t("Explore published menus first. Sign in when you are ready to order.")}</p></div><Image src="/assets/home-thali.avif" width={340} height={260} alt={t("Home-style meal inspiration")}/></header>
  <section className="browse-location" aria-labelledby="browse-location-title"><div><AppIcon name="route"/><h2 id="browse-location-title">{t("Where would you like your meal?")}</h2></div><form action="/browse" method="get"><label htmlFor="browse-city">{t("City")}</label><div><input id="browse-city" name="city" defaultValue={city} maxLength={80} required autoComplete="address-level2"/><button className="button" type="submit">{t("Find kitchens")}</button></div></form><small>{t("Delivery coverage and charges are confirmed using your saved address at checkout.")}</small></section>
  <section id="nearby-kitchens" className="browse-results" aria-labelledby="browse-results-title"><header><div><h2 id="browse-results-title">{t("Kitchens in {city}",{city})}</h2><p>{t("Only approved kitchens with published, available meals are shown.")}</p></div><Link href="/help#customer-workspace">{t("How ordering works")} ↗</Link></header>
   {kitchens.length>0&&<div className="browse-filters"><label><span className="visually-hidden">{t("Search kitchens or meals")}</span><input type="search" placeholder={t("Search kitchens or meals")} value={query} onChange={e=>setQuery(e.target.value)}/></label><button type="button" className="browse-filter-chip" aria-pressed={vegetarian} onClick={()=>setVegetarian(v=>!v)}>{t("Vegetarian")}</button>{(query||vegetarian)&&<button type="button" className="text-link" onClick={()=>{setQuery("");setVegetarian(false);}}>{t("Clear filters")}</button>}</div>}
   {!available?<div className="browse-empty" role="status"><AppIcon name="help"/><h3>{t("Kitchens could not load right now.")}</h3><p>{t("Please try again. You can still open Help or sign in.")}</p><Link className="button button-light" href={"/browse?city="+encodeURIComponent(city)}>{t("Try again")}</Link></div>:!filtered.length?<div className="browse-empty" role="status"><AppIcon name="meal"/><h3>{t(kitchens.length?"No kitchens match these filters.":"No published meals here yet.")}</h3><p>{t(kitchens.length?"Try another meal name or clear your filters.":"Try another city or check back when local kitchens publish their menus.")}</p>{kitchens.length>0&&<button type="button" className="button button-light" onClick={()=>{setQuery("");setVegetarian(false);}}>{t("Clear filters")}</button>}</div>:<div className="browse-kitchen-grid">{filtered.map(k=>{
    const meals=k.meals.filter(m=>!vegetarian||m.category!=="NON_VEGETARIAN");
    const starting=Math.min(...meals.map(m=>m.price));
    return <article className="browse-kitchen-card" key={k.id}><div className="browse-kitchen-heading"><span className="browse-kitchen-icon"><AppIcon name="home"/></span><div><h3>{k.name}</h3><p>{[k.locality,k.city].filter(Boolean).join(", ")}</p></div></div><p className="browse-cuisine">{k.cuisine||t("Home-style meals")}</p><div className="browse-card-meta"><strong>{t("From")} {kitchenMoney(starting)}</strong><span>{t("Published menu")}</span></div><details><summary>{t("View menu")}<span aria-hidden="true">＋</span></summary><ul className="browse-menu-list">{meals.map(m=><li key={m.menuId}><div><strong>{m.name}</strong><span>{kitchenMoney(m.price)}</span></div><small>{kitchenMenuDate(m.serviceDate,locale)} · {m.deliveryTime} · {t(m.category==="NON_VEGETARIAN"?"Non-vegetarian":"Vegetarian")}</small>{m.description&&<p>{m.description}</p>}<MealDetails meal={m}/></li>)}</ul><Link className="button" href={customer?"/customer/kitchens/"+encodeURIComponent(k.id):accountHome||signInLink("/sign-in",k.id)}>{t(customer?"Choose your meal":accountHome?"Open your workspace":"Sign in to order")}</Link>{!accountHome&&<small className="browse-handoff-note">{t("Your kitchen will reopen after customer sign-in.")}</small>}</details></article>;
   })}</div>}
  </section>
  <section className="browse-next"><div><AppIcon name="orders"/><h2>{t("Already ordered?")}</h2><p>{t("Sign in to see your orders and delivery updates.")}</p><Link className="text-link" href="/customer/orders">{t("View your orders")} →</Link></div><div><AppIcon name="people"/><h2>{t("New to Paustik?")}</h2><p>{t("Google can create your customer account. Email registration is also available.")}</p><Link className="text-link" href="/sign-in">{t("Sign in or create an account")} →</Link></div></section>
  <SupportLinks/>
  {practiceEnabled&&<details className="browse-practice"><summary>{t("Want to try a practice menu?")}</summary><p>{t("Fictional kitchens for testing. No food is delivered and no real payment is taken.")}</p><Link href="/pilot">{t("Explore practice kitchens")} →</Link></details>}
  <nav className="browse-bottom-nav" aria-label={t("App navigation")}><Link href="/browse" aria-current="page"><AppIcon name="home"/>{t("Home")}</Link><Link href={accountHome&&!customer?accountHome:"/customer/orders"}><AppIcon name="orders"/>{t(accountHome&&!customer?"Your workspace":"Orders")}</Link><Link href="/help"><AppIcon name="help"/>{t("Help")}</Link><Link href={accountHome||"/sign-in"}><AppIcon name="people"/>{t("Account")}</Link></nav>
 </main>;
}
