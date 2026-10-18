import { DELIVERY_FEE_INR } from "@/lib/marketplace-rules";

export type PlanMenu = { menuId: string; name: string; serviceDate: string; price: number; servings: number; category?: string; components?: string[]; deliveryTime?: string };

export function groupPlanMenus(menus: PlanMenu[]) {
  const groups = new Map<string, PlanMenu[]>();
  for (const menu of menus) groups.set(menu.serviceDate, [...(groups.get(menu.serviceDate) ?? []), menu]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function selectedPlanMenus(menus: PlanMenu[], selected: string[], quantity: number) {
  const selectedIds = new Set(selected);
  return groupPlanMenus(menus).flatMap(([, options]) => {
    const choice = options.find((menu) => selectedIds.has(menu.menuId) && menu.servings >= quantity);
    return choice ? [choice] : [];
  }).slice(0, 7);
}

export function togglePlanMenu(menus: PlanMenu[], selected: string[], choice: PlanMenu) {
  const existing = selected.filter((id) => menus.find((menu) => menu.menuId === id)?.serviceDate !== choice.serviceDate);
  if (selected.includes(choice.menuId)) return existing;
  if (existing.length >= 7) return selected;
  return [...existing, choice.menuId];
}

export function planTotals(menus: PlanMenu[], quantity: number) {
  const meals = menus.reduce((sum, menu) => sum + menu.price * quantity, 0);
  const delivery = DELIVERY_FEE_INR * menus.length;
  return { meals, delivery, total: meals + delivery };
}
