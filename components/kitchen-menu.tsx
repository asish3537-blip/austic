"use client";

import { BulkMealRequest } from "@/components/bulk-bookings";
import { UiText } from "@/components/ui-language";
import { useState } from "react";
import { PlaceOrderButton } from "@/components/customer-marketplace-controls";
import { kitchenMenuDate, kitchenMoney, mealCategoryLabel, type KitchenMeal } from "@/lib/customer-kitchen-types";

export function KitchenMenu({ meals, sample, canOrder }: { meals: KitchenMeal[]; sample: boolean; canOrder: boolean }) {
  const days = [...new Set(meals.map((meal) => meal.serviceDate))].sort();
  const [selectedDay, setSelectedDay] = useState(days[0] ?? "");
  const [period,setPeriod]=useState("ALL");
  const [diet, setDiet] = useState("all");
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const dayMeals = meals.filter((meal) => meal.serviceDate === activeDay && (period==="ALL"||(meal.mealPeriod??"LUNCH")===period) && (diet === "all" || (diet === "veg" ? meal.category !== "NON_VEGETARIAN" : meal.category === "NON_VEGETARIAN")));

  return <section className="kitchen-menu-section" id="kitchen-menu" aria-labelledby="kitchen-menu-heading">
    <div className="kitchen-section-heading"><div><span className="eyebrow">Cooked for your day</span><h2 id="kitchen-menu-heading"><UiText text="This kitchen’s menu"/></h2><p>Choose breakfast, lunch or light dinner. Order once or reserve 3–7 days. Dinner delivery ends by 9 p.m. IST.</p></div><label className="kitchen-diet-select"><UiText text="Meal preference"/><select value={diet} onChange={(event) => setDiet(event.target.value)}><option value="all">All meals</option><option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option></select></label></div>
    <label>Meal period<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="ALL">All periods</option><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Light dinner</option></select></label><div className="kitchen-date-tabs" role="group" aria-label="Menu delivery date">{days.map((day) => <button key={day} type="button" aria-pressed={activeDay === day} onClick={() => setSelectedDay(day)}>{kitchenMenuDate(day)}</button>)}</div>
    <p className="kitchen-result-count" role="status">{dayMeals.length} {dayMeals.length === 1 ? "meal" : "meals"} for {activeDay ? kitchenMenuDate(activeDay) : "this week"}</p>
    {dayMeals.length > 0 ? <div className="kitchen-menu-grid">{dayMeals.map((meal) => <article className="kitchen-dish" key={meal.menuId ?? meal.id}>
      <div className="kitchen-dish-heading"><span className={"kitchen-diet-badge " + (meal.category === "NON_VEGETARIAN" ? "is-nonveg" : "")}>{mealCategoryLabel(meal.category)}</span><strong>{kitchenMoney(meal.price)}</strong></div>
      <h3>{meal.name}</h3>{meal.oneTimeOnly&&<span className="special-badge">One-time special</span>}<ul className="kitchen-dish-items">{meal.components.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      <p className="kitchen-dish-slot">{meal.mealPeriod??"LUNCH"} · Delivery at {meal.deliveryTime} IST · {sample ? "Sample availability" : `${meal.servings} servings left`}</p>
      {!sample && meal.menuId && canOrder && <><PlaceOrderButton menuId={meal.menuId} servings={meal.servings}/><BulkMealRequest menuId={meal.menuId} stock={meal.servings}/></>}{!meal.oneTimeOnly&&<a href="#kitchen-subscription" className="button button-small"><UiText text="Choose subscription"/><span aria-hidden="true">→</span></a>}
      
    </article>)}</div> : <div className="kitchen-empty"><h3>No meals match that preference on this day</h3><p>Choose another day or select “All meals”.</p></div>}
  </section>;
}
