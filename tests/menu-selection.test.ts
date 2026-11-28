import { test } from "node:test";
import assert from "node:assert/strict";
import { selectMenuMeals } from "../lib/menu-selection";
import type { KitchenMeal } from "../lib/customer-kitchen-types";
const base: KitchenMeal = { id: "a", name: "Dal bowl", description: null, category: "VEGAN", tier: "BASE", components: ["Rice", "Lentils"], price: 79, serviceDate: "2026-12-01", deliveryTime: "12:30", servings: 2 };
const meals = [base, { ...base, id: "b", name: "Chicken curry", category: "NON_VEGETARIAN", components: ["Chicken"], mealPeriod: "DINNER" }, { ...base, id: "c", serviceDate: "2026-12-02" }];
const filters = { day: "2026-12-01", query: "", period: "ALL", diet: "all" };
test("search finds ingredients and ignores case and outer whitespace", () => {
  assert.deepEqual(selectMenuMeals(meals, { ...filters, query: " LENTILS " }).map(m => m.id), ["a"]);
});
test("diet, date and period all apply together, including default lunch", () => {
  assert.deepEqual(selectMenuMeals(meals, { ...filters, diet: "veg", period: "LUNCH" }).map(m => m.id), ["a"]);
  assert.equal(selectMenuMeals(meals, { ...filters, diet: "veg", period: "DINNER" }).length, 0);
});
test("clearing filters restores the active day without exposing other dates", () => {
  assert.equal(selectMenuMeals(meals, { ...filters, query: "no match" }).length, 0);
  assert.deepEqual(selectMenuMeals(meals, filters).map(m => m.id), ["a", "b"]);
});
