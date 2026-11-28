"use client";

import { KitchenAvatar } from "@/components/kitchen-avatar";
import Link from "next/link";
import { useState } from "react";
import { FavoriteKitchenButton } from "@/components/customer-marketplace-controls";
import { kitchenMoney, type CustomerKitchen } from "@/lib/customer-kitchen-types";
import {filterCustomerKitchens} from "@/lib/customer-discovery-filters";
import {UiText,useUiLanguage} from "@/components/ui-language";

type Diet = "all" | "vegetarian" | "non-vegetarian";

function KitchenCard({ kitchen, sample, onSelect,mode="all" }: { kitchen: CustomerKitchen; sample: boolean; onSelect?: (kitchen: CustomerKitchen) => void;mode?:string }) {
  const {t}=useUiLanguage();
  const price = kitchen.meals.length ? Math.min(...kitchen.meals.map(meal => meal.price)) : null;
  const hasVeg = kitchen.meals.some(meal => meal.category !== "NON_VEGETARIAN");
  const hasNonVeg = kitchen.meals.some(meal => meal.category === "NON_VEGETARIAN");
  const content = <><KitchenAvatar name={kitchen.motherName} image={kitchen.profileImage} kind={kitchen.imageKind}/><div className="kitchen-compact-copy"><div className="kitchen-result-title"><h3>{kitchen.name}</h3><span className="kitchen-result-rating">{kitchen.rating > 0 ? `★ ${kitchen.rating.toFixed(1)}` : t("New")}</span></div><p><UiText text={"By"}/>{" "}{kitchen.motherName} · {kitchen.locality}</p><span className="kitchen-compact-cuisine">{kitchen.cuisine.split("·")[0].trim()} · <UiText text={hasVeg && hasNonVeg ? "Veg & non-veg" : hasNonVeg ? "Non-veg" : "Vegetarian"}/></span><div className="kitchen-result-bottom"><span>{price !== null ? <><UiText text={"From"}/>{" "}<strong>{kitchenMoney(price)}</strong></> : <UiText text="Menu coming soon"/>}{kitchen.distanceKm !== undefined && <small> · {kitchen.distanceKm.toFixed(1)}{" "}<UiText text={"km"}/></small>}</span><b><UiText text={"View menu →"}/></b></div>{kitchen.canDeliver===false&&!sample&&<small className="kitchen-sample-label"><UiText text={"Outside 25 km delivery area · browse only"}/></small>}{sample && <small className="kitchen-sample-label"><UiText text={"Sample · no booking"}/></small>}</div></>;
  return <article className="kitchen-result-card kitchen-compact-card">{onSelect ? <button type="button" className="kitchen-result-main" onClick={() => onSelect(kitchen)} aria-label={t("View {kitchen}, menu and subscriptions",{kitchen:kitchen.name})}>{content}</button> : <Link className="kitchen-result-main" href={"/customer/kitchens/" + encodeURIComponent(kitchen.id)+(mode==="subscription"?"#kitchen-subscription":mode==="once"?"#kitchen-menu":"")} aria-label={t("View {kitchen}, menu and subscriptions",{kitchen:kitchen.name})}>{content}</Link>}{!sample && <div className="kitchen-result-save"><FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)}/></div>}</article>;
}

export function KitchenDiscovery({ kitchens, sampleKitchens, hasDeliveryPin, deliveryArea, available, previewOnly = false, onPreviewSelect,initialMode="all",initialQuery="" }: {
  kitchens: CustomerKitchen[];
  sampleKitchens: CustomerKitchen[];
  hasDeliveryPin: boolean;
  deliveryArea: string;
  available: boolean;
  previewOnly?: boolean;
  onPreviewSelect?: (kitchen: CustomerKitchen) => void;
  initialMode?:string; initialQuery?:string;
}) {
  const {t}=useUiLanguage();
  const [view, setView] = useState<"list" | "grid">("grid");
  const [search, setSearch] = useState(initialQuery);
  const [diet, setDiet] = useState<Diet>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [period,setPeriod]=useState("ALL"),[cuisine,setCuisine]=useState(""),[maxPrice,setMaxPrice]=useState(0),[sort,setSort]=useState("nearest"),[mode,setMode]=useState(initialMode);
  const results=filterCustomerKitchens(kitchens,{query:search,diet,savedOnly,period,cuisine,maxPrice:maxPrice||Infinity,sort,mode});
  const activeFilters = Boolean(search.trim() || diet !== "all" || savedOnly||period!=="ALL"||cuisine||maxPrice||mode!=="all");
  function clearFilters(){setSearch("");setDiet("all");setSavedOnly(false);setPeriod("ALL");setCuisine("");setMaxPrice(0);setMode("all");setSort("nearest");}

  return <section className="kitchen-discovery discovery-compact" id="customer-discover" aria-labelledby="nearby-kitchens-title">
    <div className="kitchen-section-heading"><div><h2 id="nearby-kitchens-title">{t(hasDeliveryPin?"Kitchens near you":"Explore mother-led kitchens")}</h2>{deliveryArea&&<small>{deliveryArea}</small>}</div><Link className="text-link" href="/help#customer-workspace">{t("Help")} ↗</Link></div>
    {kitchens.length>0&&<div className="kitchen-filters compact-discovery-filters">
     <label className="kitchen-search"><span className="visually-hidden">{t("Search kitchens or meals")}</span><input type="search" placeholder={t("Search kitchens or meals")} value={search} onChange={e=>setSearch(e.target.value)}/></label>
     <details className="discovery-more-filters"><summary>{t("Filters")}{activeFilters&&<span aria-hidden="true"> ·</span>}</summary><div>
      <label>{t("Order type")}<select value={mode} onChange={e=>setMode(e.target.value)}><option value="all">{t("All meals")}</option><option value="subscription">{t("Meal subscriptions")}</option><option value="once">{t("One-time meals")}</option></select></label>
      <label>{t("Meal preference")}<select value={diet} onChange={e=>setDiet(e.target.value as Diet)}><option value="all">{t("All kitchens")}</option><option value="vegetarian">{t("Vegetarian")}</option><option value="non-vegetarian">{t("Non-vegetarian")}</option></select></label>
      <label>{t("Meal period")}<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="ALL">{t("All periods")}</option><option value="BREAKFAST">{t("Breakfast")}</option><option value="LUNCH">{t("Lunch")}</option><option value="DINNER">{t("Light dinner")}</option></select></label>
      <label>{t("Cuisine")}<select value={cuisine} onChange={e=>setCuisine(e.target.value)}><option value="">{t("All cuisines")}</option>{[...new Set(kitchens.map(k=>k.cuisine))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
      <label>{t("Meal budget")}<select value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))}><option value={0}>{t("Any price")}</option><option value={79}>{t("Up to ₹79")}</option><option value={99}>{t("Up to ₹99")}</option></select></label>
      <label>{t("Sort kitchens")}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="nearest">{t("Nearest first")}</option><option value="rating">{t("Highest rated")}</option><option value="price">{t("Lowest meal price")}</option></select></label>
      <button type="button" className="plain-button" aria-pressed={savedOnly} onClick={()=>setSavedOnly(v=>!v)}>{t("Saved kitchens")}</button><button type="button" className="plain-button" onClick={clearFilters}>{t("Clear filters")}</button>
      <div className="kitchen-view-switch" role="group" aria-label={t("Kitchen view")}><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")}>{t("List")}</button><button type="button" aria-pressed={view==="grid"} onClick={()=>setView("grid")}>{t("Grid")}</button></div>
     </div></details>
    </div>}
    {results.length>0?<><p className="kitchen-result-count" role="status">{t("{count} kitchens available",{count:results.length})}</p><div className={"kitchen-result-grid kitchen-view-"+view}>{results.map(k=><KitchenCard key={k.id} kitchen={k} sample={previewOnly} onSelect={onPreviewSelect} mode={mode}/>)}</div></>:<div className="discovery-empty-inline" role="status"><p>{t(!available?"Kitchen availability is temporarily unavailable":activeFilters&&kitchens.length?"No kitchens match these filters":"No published meals in this area yet.")}</p><p>{t(!available?"Refresh this page to retry. Your existing orders are still available in Orders.":kitchens.length?"Try fewer filters or a different meal period.":"Check your delivery address, try another area or return when new menus are published.")}</p><a className="text-link" href={previewOnly?"/browse":"/account/settings#delivery-address"}>{t(previewOnly?"Browse kitchens":"Check delivery address")} →</a>{activeFilters&&kitchens.length>0&&<button type="button" className="plain-button" onClick={clearFilters}>{t("Clear filters")}</button>}</div>}
    {kitchens.length===0&&<details className="discovery-samples"><summary>{t("Browse sample menus")}</summary><p>{t("Sample kitchens, menus and subscription prices. No orders are created.")}</p><div className={"kitchen-result-grid kitchen-view-"+view}>{sampleKitchens.map(k=><KitchenCard key={k.id} kitchen={k} sample/>)}</div></details>}
  </section>;
}
