"use client";

import { KitchenAvatar } from "@/components/kitchen-avatar";
import Link from "next/link";
import { useState } from "react";
import { FavoriteKitchenButton } from "@/components/customer-marketplace-controls";
import { kitchenMoney, type CustomerKitchen } from "@/lib/customer-kitchen-types";

type Diet = "all" | "vegetarian" | "non-vegetarian";

function KitchenCard({ kitchen, sample, onSelect }: { kitchen: CustomerKitchen; sample: boolean; onSelect?: (kitchen: CustomerKitchen) => void }) {
  const price = kitchen.meals.length ? Math.min(...kitchen.meals.map(meal => meal.price)) : null;
  const hasVeg = kitchen.meals.some(meal => meal.category !== "NON_VEGETARIAN");
  const hasNonVeg = kitchen.meals.some(meal => meal.category === "NON_VEGETARIAN");
  const content = <><KitchenAvatar name={kitchen.motherName} image={kitchen.profileImage} kind={kitchen.imageKind}/><div className="kitchen-compact-copy"><div className="kitchen-result-title"><h3>{kitchen.name}</h3><span className="kitchen-result-rating">{kitchen.rating > 0 ? `★ ${kitchen.rating.toFixed(1)}` : "New"}</span></div><p>By {kitchen.motherName} · {kitchen.locality}</p><span className="kitchen-compact-cuisine">{kitchen.cuisine.split("·")[0].trim()} · {hasVeg && hasNonVeg ? "Veg & non-veg" : hasNonVeg ? "Non-veg" : "Vegetarian"}</span><div className="kitchen-result-bottom"><span>{price !== null ? <>From <strong>{kitchenMoney(price)}</strong></> : "Menu coming soon"}{kitchen.distanceKm !== undefined && <small> · {kitchen.distanceKm.toFixed(1)} km</small>}</span><b>View menu →</b></div>{sample && <small className="kitchen-sample-label">Sample · no booking</small>}</div></>;
  return <article className="kitchen-result-card kitchen-compact-card">{onSelect ? <button type="button" className="kitchen-result-main" onClick={() => onSelect(kitchen)} aria-label={`View ${kitchen.name}, menu and subscriptions`}>{content}</button> : <Link className="kitchen-result-main" href={"/customer/kitchens/" + encodeURIComponent(kitchen.id)} aria-label={`View ${kitchen.name}, menu and subscriptions`}>{content}</Link>}{!sample && <div className="kitchen-result-save"><FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)}/></div>}</article>;
}

export function KitchenDiscovery({ kitchens, sampleKitchens, hasDeliveryPin, deliveryArea, available, previewOnly = false, onPreviewSelect }: {
  kitchens: CustomerKitchen[];
  sampleKitchens: CustomerKitchen[];
  hasDeliveryPin: boolean;
  deliveryArea: string;
  available: boolean;
  previewOnly?: boolean;
  onPreviewSelect?: (kitchen: CustomerKitchen) => void;
}) {
  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const query = search.trim().toLocaleLowerCase("en-IN");
  const results = kitchens.filter((kitchen) => {
    const matchesSearch = [kitchen.name, kitchen.motherName, kitchen.cuisine, kitchen.locality, ...kitchen.meals.map((meal) => meal.name)].join(" ").toLocaleLowerCase("en-IN").includes(query);
    const matchesDiet = diet === "all" || kitchen.meals.some((meal) => diet === "vegetarian" ? meal.category !== "NON_VEGETARIAN" : meal.category === "NON_VEGETARIAN");
    return matchesSearch && matchesDiet && (!savedOnly || kitchen.isFavorite);
  });
  const activeFilters = Boolean(query || diet !== "all" || savedOnly);

  return <section className="kitchen-discovery" id="customer-discover" aria-labelledby="nearby-kitchens-title">
    <div className="kitchen-section-heading"><div><span className="eyebrow">Your neighbourhood</span><h2 id="nearby-kitchens-title">{hasDeliveryPin ? "Kitchens near you" : "Explore mother-led kitchens"}</h2><p>{deliveryArea ? `Your delivery area: ${deliveryArea}. ` : ""}{hasDeliveryPin ? "Kitchens below serve your saved delivery pin." : "Set your delivery pin above to confirm which kitchens deliver to you."}</p></div><Link className="text-link" href="/help#customer-workspace">How ordering works ↗</Link></div>

    <div className="kitchen-filters">
      <label className="kitchen-search"><span>Search kitchens or meals</span><input type="search" placeholder="Try a mother’s name, cuisine or dish" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="kitchen-filter-options" role="group" aria-label="Dietary options">{([{ value: "all", label: "All kitchens" }, { value: "vegetarian", label: "Vegetarian" }, { value: "non-vegetarian", label: "Non-vegetarian" }] as const).map((option) => <button key={option.value} type="button" aria-pressed={diet === option.value} onClick={() => setDiet(option.value)}>{option.label}</button>)}<button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)}>♡ Saved kitchens</button></div>
    </div>
    <div className="kitchen-view-switch" role="group" aria-label="Kitchen view"><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>☰ List</button><button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>▦ Grid</button></div>
    <p className="kitchen-result-count" role="status">{available ? `${results.length} ${results.length === 1 ? "kitchen" : "kitchens"} with published menus${activeFilters ? " matching your filters" : ""}` : "Kitchen availability is temporarily unavailable"}</p>
    {results.length > 0 ? <div className={"kitchen-result-grid kitchen-view-" + view}>{results.map((kitchen) => <KitchenCard key={kitchen.id} kitchen={kitchen} sample={previewOnly} onSelect={onPreviewSelect} />)}</div> : <div className="kitchen-empty">
      <span aria-hidden="true">⌂</span><h3>{!available ? "We couldn’t load kitchens right now" : activeFilters ? "No kitchens match these filters" : "No available menus in this area yet"}</h3>
      <p>{!available ? "Refresh the page to try again. Your saved orders and account are unchanged." : activeFilters ? "Try a different dish or clear the filters to see all available kitchens." : "No published meals in this area yet."}</p>
      {activeFilters && <button className="button button-small" type="button" onClick={() => { setSearch(""); setDiet("all"); setSavedOnly(false); }}>Clear filters</button>}
    </div>}
    {kitchens.length === 0 && <div className="kitchen-preview-section"><button type="button" aria-expanded={showSamples} aria-controls="sample-kitchens" className="kitchen-preview-toggle" onClick={() => setShowSamples((value) => !value)}><span><strong>Browse sample menus</strong><small>Sample kitchens, menus and subscription prices. No orders are created.</small></span><span aria-hidden="true">{showSamples ? "−" : "+"}</span></button>{showSamples && <div id="sample-kitchens" className={"kitchen-result-grid kitchen-view-" + view}>{sampleKitchens.map((kitchen) => <KitchenCard key={kitchen.id} kitchen={kitchen} sample />)}</div>}</div>}
  </section>;
}
