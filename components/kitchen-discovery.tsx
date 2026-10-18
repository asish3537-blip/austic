"use client";

import Link from "next/link";
import { useState } from "react";
import { FavoriteKitchenButton } from "@/components/customer-marketplace-controls";
import { kitchenMoney, type CustomerKitchen } from "@/lib/customer-kitchen-types";

type Diet = "all" | "vegetarian" | "non-vegetarian";

function KitchenCard({ kitchen, sample }: { kitchen: CustomerKitchen; sample: boolean }) {
  const days = new Set(kitchen.meals.map((meal) => meal.serviceDate)).size;
  const startingPrice = Math.min(...kitchen.meals.map((meal) => meal.price));
  const href = "/customer/kitchens/" + encodeURIComponent(kitchen.id);
  const cuisines = kitchen.cuisine.split("·");
  const hasVegetarian = kitchen.meals.some((meal) => meal.category !== "NON_VEGETARIAN");
  const hasNonVegetarian = kitchen.meals.some((meal) => meal.category === "NON_VEGETARIAN");
  const dietLabel = hasVegetarian && hasNonVegetarian ? "Veg & non-veg options" : hasNonVegetarian ? "Non-vegetarian options" : "Vegetarian options";

  return <article className="kitchen-result-card">
    <Link className="kitchen-result-main" href={href} aria-label={`View ${kitchen.name}, menu and subscriptions`}>
      <div className="kitchen-result-cover">
        <span className="kitchen-result-avatar" aria-hidden="true">{kitchen.motherName.slice(0, 1)}</span>
        <span className="kitchen-result-cover-copy"><small>MOTHER-LED KITCHEN</small><strong>Made by {kitchen.motherName}</strong></span>
        <span className="kitchen-result-badge">{sample ? "Sample kitchen" : "Accepting orders"}</span>
      </div>
      <div className="kitchen-result-info">
        <div className="kitchen-result-title"><h3>{kitchen.name}</h3><span className="kitchen-result-rating">{kitchen.rating > 0 ? `★ ${kitchen.rating.toFixed(1)}` : "New"}</span></div>
        <p>{kitchen.locality}, {kitchen.city}</p>
        <div className="kitchen-result-tags">{cuisines.map((cuisine) => <span key={cuisine}>{cuisine.trim()}</span>)}<span>{dietLabel}</span></div>
        <div className="kitchen-result-facts"><span>{kitchen.distanceKm !== undefined ? `${kitchen.distanceKm.toFixed(1)} km away` : sample ? "Preview location" : "Set a pin to check distance"}</span><span>{days} menu {days === 1 ? "day" : "days"}</span></div>
        <div className="kitchen-result-bottom"><span>Meals from <strong>{kitchenMoney(startingPrice)}</strong></span><b>View menu <span aria-hidden="true">→</span></b></div>
      </div>
    </Link>
    {!sample && <div className="kitchen-result-save"><FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)} /></div>}
  </article>;
}

export function KitchenDiscovery({ kitchens, sampleKitchens, hasDeliveryPin, deliveryArea, available }: {
  kitchens: CustomerKitchen[];
  sampleKitchens: CustomerKitchen[];
  hasDeliveryPin: boolean;
  deliveryArea: string;
  available: boolean;
}) {
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
    <div className="kitchen-section-heading"><div><span className="eyebrow">Find your everyday favourite</span><h2 id="nearby-kitchens-title">{hasDeliveryPin ? "Kitchens near you" : "Explore mother-led kitchens"}</h2><p>{deliveryArea ? `Your delivery area: ${deliveryArea}. ` : ""}{hasDeliveryPin ? "Kitchens below serve your saved delivery pin." : "Set your delivery pin above to confirm which kitchens deliver to you."}</p></div><Link className="text-link" href="/help#customer-workspace">How ordering works ↗</Link></div>
    <ol className="kitchen-journey" aria-label="Choose your meals in three steps"><li className="is-current"><span>1</span>Choose a kitchen</li><li><span>2</span>Explore its menu</li><li><span>3</span>Build your subscription</li></ol>
    <div className="kitchen-filters">
      <label className="kitchen-search"><span>Search kitchens or meals</span><input type="search" placeholder="Try a mother’s name, cuisine or dish" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="kitchen-filter-options" role="group" aria-label="Dietary options">{([{ value: "all", label: "All kitchens" }, { value: "vegetarian", label: "Vegetarian" }, { value: "non-vegetarian", label: "Non-vegetarian" }] as const).map((option) => <button key={option.value} type="button" aria-pressed={diet === option.value} onClick={() => setDiet(option.value)}>{option.label}</button>)}<button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)}>♡ Saved kitchens</button></div>
    </div>
    <p className="kitchen-result-count" role="status">{available ? `${results.length} ${results.length === 1 ? "kitchen" : "kitchens"} with published menus${activeFilters ? " matching your filters" : ""}` : "Kitchen availability is temporarily unavailable"}</p>
    {results.length > 0 ? <div className="kitchen-result-grid">{results.map((kitchen) => <KitchenCard key={kitchen.id} kitchen={kitchen} sample={false} />)}</div> : <div className="kitchen-empty">
      <span aria-hidden="true">⌂</span><h3>{!available ? "We couldn’t load kitchens right now" : activeFilters ? "No kitchens match these filters" : "No available menus in this area yet"}</h3>
      <p>{!available ? "Refresh the page to try again. Your saved orders and account are unchanged." : activeFilters ? "Try a different dish or clear the filters to see all available kitchens." : "A kitchen appears here when its mother is approved, its menu is published and meals are available. You can explore a sample below while your neighbourhood gets ready."}</p>
      {activeFilters && <button className="button button-small" type="button" onClick={() => { setSearch(""); setDiet("all"); setSavedOnly(false); }}>Clear filters</button>}
    </div>}
    {kitchens.length === 0 && <div className="kitchen-preview-section"><button type="button" aria-expanded={showSamples} aria-controls="sample-kitchens" className="kitchen-preview-toggle" onClick={() => setShowSamples((value) => !value)}><span><strong>See how kitchen discovery works</strong><small>Sample kitchens, menus and subscription prices. No orders are created.</small></span><span aria-hidden="true">{showSamples ? "−" : "+"}</span></button>{showSamples && <div id="sample-kitchens" className="kitchen-result-grid">{sampleKitchens.map((kitchen) => <KitchenCard key={kitchen.id} kitchen={kitchen} sample />)}</div>}</div>}
  </section>;
}
