import type { KitchenMeal } from "./customer-kitchen-types";

export function selectMenuMeals(meals: KitchenMeal[], filters: { day?: string; query: string; period: string; diet: string }) {
  const query = filters.query.trim().toLocaleLowerCase();
  return meals.filter(meal => meal.serviceDate === filters.day
    && [meal.name, meal.description ?? "", ...meal.components, ...(meal.ingredients ?? [])].join(" ").toLocaleLowerCase().includes(query)
    && (filters.period === "ALL" || (meal.mealPeriod ?? "LUNCH") === filters.period)
    && (filters.diet === "all" || (filters.diet === "veg" ? meal.category !== "NON_VEGETARIAN" : meal.category === "NON_VEGETARIAN")));
}
