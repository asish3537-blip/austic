"use client";

import {MealDetails} from "@/components/meal-details";
import { BulkMealRequest } from "@/components/bulk-bookings";
import { UiText,useUiLanguage } from "@/components/ui-language";
import { useState } from "react";
import { selectMenuMeals } from "@/lib/menu-selection";
import { PlaceOrderButton } from "@/components/customer-marketplace-controls";
import { kitchenMenuDate, kitchenMoney, mealCategoryLabel, type KitchenMeal } from "@/lib/customer-kitchen-types";

export function KitchenMenu({ meals, sample, canOrder }: { meals: KitchenMeal[]; sample: boolean; canOrder: boolean }) {
  const {locale,t}=useUiLanguage();
  const days = [...new Set(meals.map((meal) => meal.serviceDate))].sort();
  const [selectedDay, setSelectedDay] = useState(days[0] ?? "");
  const [period,setPeriod]=useState("ALL");
  const [diet, setDiet] = useState("all");
  const [query, setQuery] = useState("");
  const resetFilters = () => { setDiet("all"); setPeriod("ALL"); setQuery(""); };
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const dayMeals = selectMenuMeals(meals, { day: activeDay, query, period, diet });

  return <section className="kitchen-menu-section" id="kitchen-menu" aria-labelledby="kitchen-menu-heading">
    <div className="kitchen-section-heading"><div><span className="eyebrow"><UiText text={"Cooked for your day"}/></span><h2 id="kitchen-menu-heading"><UiText text="This kitchen’s menu"/></h2><p><UiText text={"Choose breakfast, lunch or light dinner. Order once or reserve 3–7 days. Dinner delivery ends by 9 p.m. IST."}/></p></div><label className="kitchen-diet-select"><UiText text="Meal preference"/><select value={diet} onChange={(event) => setDiet(event.target.value)}><option value="all"><UiText text={"All meals"}/></option><option value="veg"><UiText text={"Vegetarian"}/></option><option value="nonveg"><UiText text={"Non-vegetarian"}/></option></select></label></div>
    <label className="menu-search"><UiText text="Search meals"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Search meals")}/></label>
    {dayMeals.length > 0 && (query || diet !== "all" || period !== "ALL") && <button type="button" className="button button-small" onClick={resetFilters}><UiText text="Clear filters"/></button>}
    <label><UiText text={"Meal period"}/><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="ALL"><UiText text={"All periods"}/></option><option value="BREAKFAST"><UiText text={"Breakfast"}/></option><option value="LUNCH"><UiText text={"Lunch"}/></option><option value="DINNER"><UiText text={"Light dinner"}/></option></select></label><div className="kitchen-date-tabs" role="group" aria-label={t("Menu delivery date")}>{days.map((day) => <button key={day} type="button" aria-pressed={activeDay === day} onClick={() => setSelectedDay(day)}>{kitchenMenuDate(day,locale)}</button>)}</div>
    <p className="kitchen-result-count" role="status">{dayMeals.length} <UiText text={dayMeals.length === 1 ? "meal" : "meals"}/>{" "}<UiText text={"for"}/>{" "}{activeDay ? kitchenMenuDate(activeDay,locale) : t("this week")}</p>
    {dayMeals.length > 0 ? <div className="kitchen-menu-grid">{dayMeals.map((meal) => <article className="kitchen-dish" key={meal.menuId ?? meal.id}>
      <div className="kitchen-dish-heading"><span className={"kitchen-diet-badge " + (meal.category === "NON_VEGETARIAN" ? "is-nonveg" : "")}><UiText text={mealCategoryLabel(meal.category)}/></span><strong>{kitchenMoney(meal.price)}</strong></div>
      <h3>{meal.name}</h3>{meal.oneTimeOnly&&<span className="special-badge"><UiText text={"One-time special"}/></span>}{meal.description&&<p className="kitchen-dish-description">{meal.description}</p>}{meal.components.length>0&&<ul className="kitchen-dish-items">{meal.components.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>}
      <p className="meal-serving-note"><UiText text="Price per serving · Delivery shown at checkout"/></p><MealDetails meal={meal}/><p className="kitchen-dish-slot"><UiText text={meal.mealPeriod??"LUNCH"}/>{" "}<UiText text={"· Delivery at"}/>{" "}{meal.deliveryTime}{" "}<UiText text={"IST ·"}/>{" "}{sample ? <UiText text="Sample availability"/> : <UiText text="{count} servings left" values={{count:meal.servings}}/>}</p>
      {!sample && meal.menuId && canOrder && <><PlaceOrderButton menuId={meal.menuId} servings={meal.servings}/><BulkMealRequest menuId={meal.menuId} stock={meal.servings}/></>}{!sample&&!canOrder&&<a className="text-link" href="/account/settings#delivery-address"><UiText text={"Check delivery address to order →"}/></a>}{!meal.oneTimeOnly && (sample || meal.servings > 0) && <a href="#kitchen-subscription" className="button button-small"><UiText text="Choose subscription"/><span aria-hidden="true">→</span></a>}

    </article>)}</div> : <div className="kitchen-empty"><h3><UiText text={"No meals match that preference on this day"}/></h3><p><UiText text={"Choose another day or select “All meals”."}/></p><button type="button" className="button" onClick={resetFilters}><UiText text="Clear filters"/></button></div>}
  </section>;
}
