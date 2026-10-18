import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { groupPlanMenus, planTotals, selectedPlanMenus, togglePlanMenu, type PlanMenu } from "../lib/customer-plan-selection";
import { KitchenDiscovery } from "../components/kitchen-discovery";
import { KitchenMenu } from "../components/kitchen-menu";
import { WeeklyPlanPicker } from "../components/weekly-plan-picker";

const menus: PlanMenu[] = [
  { menuId: "mon-veg", name: "Dalma", serviceDate: "2026-10-19", price: 69, servings: 4 },
  { menuId: "mon-egg", name: "Egg curry", serviceDate: "2026-10-19", price: 79, servings: 2 },
  { menuId: "tue-cheese", name: "Cheese meal", serviceDate: "2026-10-20", price: 89, servings: 4 },
  { menuId: "wed-chicken", name: "Chicken meal", serviceDate: "2026-10-21", price: 99, servings: 4 },
];
const mockRouter: AppRouterInstance = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "kitchen-journey-test" };

test("menu groups preserve alternatives and sort delivery dates", () => {
  const result = groupPlanMenus([...menus].reverse());
  assert.deepEqual(result.map(([day]) => day), ["2026-10-19", "2026-10-20", "2026-10-21"]);
  assert.equal(result[0]![1].length, 2);
});

test("choosing another meal replaces the same day's meal; choosing it again clears that day", () => {
  const selected = togglePlanMenu(menus, ["mon-veg", "tue-cheese"], menus[1]!);
  assert.deepEqual(selected, ["tue-cheese", "mon-egg"]);
  assert.deepEqual(togglePlanMenu(menus, selected, menus[1]!), ["tue-cheese"]);
});

test("selection excludes missing, repeated-day and insufficient-stock menu choices", () => {
  assert.deepEqual(selectedPlanMenus(menus, ["missing", "mon-veg", "mon-egg", "tue-cheese"], 3).map((meal) => meal.menuId), ["mon-veg", "tue-cheese"]);
  assert.equal(selectedPlanMenus(menus, ["mon-egg"], 3).length, 0);
});

test("a subscription never selects more than seven days", () => {
  const days = Array.from({ length: 8 }, (_, index) => ({ ...menus[0]!, menuId: "day-" + index, serviceDate: `2026-10-${19 + index}` }));
  const selected = days.slice(0, 7).map((meal) => meal.menuId);
  assert.deepEqual(togglePlanMenu(days, selected, days[7]!), selected);
  assert.equal(selectedPlanMenus(days, days.map((meal) => meal.menuId), 1).length, 7);
});

test("totals multiply servings and charge delivery once per selected day", () => {
  const choices = selectedPlanMenus(menus, ["mon-veg", "tue-cheese", "wed-chicken"], 2);
  assert.deepEqual(planTotals(choices, 2), { meals: 514, delivery: 90, total: 604 });
  assert.deepEqual(planTotals([], 2), { meals: 0, delivery: 0, total: 0 });
});

test("discovery starts with kitchens and keeps sample content separate", () => {
  const html = renderToStaticMarkup(<KitchenDiscovery kitchens={[]} sampleKitchens={[]} hasDeliveryPin={false} deliveryArea="Patia, Bhubaneswar" available />);
  assert.match(html, /Choose a kitchen/);
  assert.match(html, /Explore its menu/);
  assert.match(html, /Build your subscription/);
  assert.match(html, /No available menus in this area yet/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /Reserve .*meal days/);
});

test("kitchen menu shows each dish with subscription action and demo status", () => {
  const meals = [{ id: "sample-dal", name: "Dalma comfort meal", category: "VEGETARIAN", tier: "BASE", components: ["Rice", "Dalma", "Greens"], price: 69, serviceDate: "2026-10-19", deliveryTime: "12:30", servings: 8 }];
  const html = renderToStaticMarkup(<KitchenMenu meals={meals} sample canOrder={false} />);
  assert.match(html, /Dalma comfort meal/);
  assert.match(html, /Choose subscription/);
  assert.match(html, /Sample availability/);
  assert.doesNotMatch(html, /Order meal/);
});

test("an available kitchen card opens its own menu without expanding dishes in discovery", () => {
  const kitchen = { id: "kitchen-one", name: "Ananya’s Kitchen", motherName: "Ananya", locality: "Patia", city: "Bhubaneswar", cuisine: "Odia", rating: 4.9, distanceKm: 2, marketplaceRadiusKm: 8, meals: [{ id: "dalma", menuId: "menu-one", name: "Dalma comfort meal", category: "VEGETARIAN", tier: "BASE", components: ["Rice", "Dalma", "Greens"], price: 69, serviceDate: "2026-10-19", deliveryTime: "12:30", servings: 4 }] };
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={mockRouter}><KitchenDiscovery kitchens={[kitchen]} sampleKitchens={[]} hasDeliveryPin deliveryArea="Patia, Bhubaneswar" available /></AppRouterContext.Provider>);
  assert.match(html, /href="\/customer\/kitchens\/kitchen-one"/);
  assert.match(html, /View menu/);
  assert.match(html, /2.0 km away/);
  assert.doesNotMatch(html, /Dalma comfort meal/);
  assert.doesNotMatch(html, /Order meal/);
});

test("subscription preview is explicit and cannot submit a live reservation", () => {
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={mockRouter}><WeeklyPlanPicker menus={menus} kitchenName="Sample kitchen" preview /></AppRouterContext.Provider>);
  assert.match(html, /Preview total only/);
  assert.match(html, /disabled=""[^>]*>Sample subscription/);
  assert.match(html, /Choose 3 more days/);
});

test("real subscription prompts for a delivery pin before reserving", () => {
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={mockRouter}><WeeklyPlanPicker menus={menus} kitchenName="Kitchen" canReserve={false} /></AppRouterContext.Provider>);
  assert.match(html, /Set your delivery pin above/);
  assert.match(html, /disabled=""[^>]*>Reserve your meal days/);
});
