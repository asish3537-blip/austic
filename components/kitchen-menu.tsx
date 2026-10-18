"use client";

import { useState } from "react";
import { PlaceOrderButton } from "@/components/customer-marketplace-controls";
import { kitchenMenuDate, kitchenMoney, mealCategoryLabel, type KitchenMeal } from "@/lib/customer-kitchen-types";

export function KitchenMenu({ meals, sample, canOrder }: { meals: KitchenMeal[]; sample: boolean; canOrder: boolean }) {
  const days = [...new Set(meals.map((meal) => meal.serviceDate))].sort();
  const [selectedDay, setSelectedDay] = useState(days[0] ?? "");
  const [diet, setDiet] = useState("all");
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const dayMeals = meals.filter((meal) => meal.serviceDate === activeDay && (diet === "all" || (diet === "veg" ? meal.category !== "NON_VEGETARIAN" : meal.category === "NON_VEGETARIAN")));

  return <section className="kitchen-menu-section" id="kitchen-menu" aria-labelledby="kitchen-menu-heading">
    <div className="kitchen-section-heading"><div><span className="eyebrow">Cooked for your day</span><h2 id="kitchen-menu-heading">This kitchen’s menu</h2><p>Every meal includes three items. Browse a day, then choose the days and meals for your subscription below.</p></div><label className="kitchen-diet-select">Meal preference<select value={diet} onChange={(event) => setDiet(event.target.value)}><option value="all">All meals</option><option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option></select></label></div>
    <div className="kitchen-date-tabs" role="group" aria-label="Menu delivery date">{days.map((day) => <button key={day} type="button" aria-pressed={activeDay === day} onClick={() => setSelectedDay(day)}>{kitchenMenuDate(day)}</button>)}</div>
    <p className="kitchen-result-count" role="status">{dayMeals.length} {dayMeals.length === 1 ? "meal" : "meals"} for {activeDay ? kitchenMenuDate(activeDay) : "this week"}</p>
    {dayMeals.length > 0 ? <div className="kitchen-menu-grid">{dayMeals.map((meal) => <article className="kitchen-dish" key={meal.menuId ?? meal.id}>
      <div className="kitchen-dish-heading"><span className={"kitchen-diet-badge " + (meal.category === "NON_VEGETARIAN" ? "is-nonveg" : "")}>{mealCategoryLabel(meal.category)}</span><strong>{kitchenMoney(meal.price)}</strong></div>
      <h3>{meal.name}</h3><ul className="kitchen-dish-items">{meal.components.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      <p className="kitchen-dish-slot">Delivery at {meal.deliveryTime} IST · {sample ? "Sample availability" : `${meal.servings} servings left`}</p>
      <a href="#kitchen-subscription" className="button button-small">Choose subscription <span aria-hidden="true">→</span></a>
      {!sample && meal.menuId && <details className="kitchen-single-order"><summary>Prefer this meal for one day?</summary><p>{kitchenMoney(meal.price)} per serving + ₹30 delivery. Wallet credit is applied first; any balance remains due. No online payment is taken.</p>{canOrder ? <PlaceOrderButton menuId={meal.menuId} servings={meal.servings} /> : <p>Set your delivery pin above before ordering.</p>}</details>}
    </article>)}</div> : <div className="kitchen-empty"><h3>No meals match that preference on this day</h3><p>Choose another day or select “All meals”.</p></div>}
  </section>;
}
