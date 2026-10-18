export type KitchenMeal = {
  id: string;
  menuId?: string;
  name: string;
  category: string;
  tier: string;
  components: string[];
  price: number;
  serviceDate: string;
  deliveryTime: string;
  servings: number;
};

export type CustomerKitchen = {
  id: string;
  name: string;
  motherName: string;
  locality: string;
  city: string;
  cuisine: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  marketplaceRadiusKm?: number;
  isFavorite?: boolean;
  meals: KitchenMeal[];
};

export function kitchenMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function kitchenMenuDate(day: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(day + "T00:00:00.000Z"));
}

export function mealCategoryLabel(category: string) {
  return category === "VEGAN" ? "Vegan" : category === "VEGETARIAN" ? "Vegetarian" : "Non-vegetarian";
}
