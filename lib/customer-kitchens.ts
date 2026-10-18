import "server-only";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { prisma } from "@/lib/prisma";
import { distanceMeters, mealDeliveryInstant, mealPriceAllowed } from "@/lib/marketplace-rules";
import type { CustomerKitchen } from "@/lib/customer-kitchen-types";

const sampleKitchenSeeds = [
  { id: "sample-ananya", name: "Ananya’s Home Kitchen", motherName: "Ananya", locality: "Patia", city: "Bhubaneswar", cuisine: "Odia · Home-style", rating: 4.9,
    meals: [{ id: "dalma", name: "Dalma comfort meal", category: "VEGETARIAN", tier: "BASE", components: ["Rice", "Dalma", "Seasonal greens"], price: 69 }, { id: "egg", name: "Egg curry lunch", category: "NON_VEGETARIAN", tier: "EGG", components: ["Rice", "Egg curry", "Seasonal vegetables"], price: 79 }] },
  { id: "sample-sabita", name: "Sabita’s Rasoi", motherName: "Sabita", locality: "Sailashree Vihar", city: "Bhubaneswar", cuisine: "Odia · Comfort meals", rating: 4.8,
    meals: [{ id: "cheese", name: "Seasonal cheese meal", category: "VEGETARIAN", tier: "CHEESE", components: ["Rice", "Cheese curry", "Seasonal vegetables"], price: 89 }, { id: "chicken", name: "Chicken curry lunch", category: "NON_VEGETARIAN", tier: "CHICKEN", components: ["Rice", "Chicken curry", "Seasonal vegetables"], price: 99 }] },
  { id: "sample-meera", name: "Meera’s Neighbourhood Kitchen", motherName: "Meera", locality: "Chandrasekharpur", city: "Bhubaneswar", cuisine: "North Indian · Home-style", rating: 4.7,
    meals: [{ id: "paneer", name: "Cheese meal box", category: "VEGETARIAN", tier: "CHEESE", components: ["Rice", "Cheese curry", "Salad"], price: 89 }, { id: "egg", name: "Egg curry meal box", category: "NON_VEGETARIAN", tier: "EGG", components: ["Rice", "Egg curry", "Seasonal vegetables"], price: 79 }] },
];

export function sampleCustomerKitchens(now = new Date()): CustomerKitchen[] {
  // Relative dates keep the explicitly labelled preview useful without creating live stock.
  const indiaDay = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  return sampleKitchenSeeds.map((kitchen) => ({
    ...kitchen,
    meals: Array.from({ length: 7 }, (_, index) => {
      const day = new Date(indiaDay + "T00:00:00.000Z");
      day.setUTCDate(day.getUTCDate() + index + 1);
      return kitchen.meals.map((meal) => ({ ...meal, id: `${kitchen.id}-${meal.id}-${index}`, serviceDate: day.toISOString().slice(0, 10), deliveryTime: "12:30", servings: 8 }));
    }).flat(),
  }));
}

export async function loadCustomerKitchenDiscovery(customerId: string) {
  if (isLocalAuthMode()) return { kitchens: [] as CustomerKitchen[], hasDeliveryPin: false, deliveryArea: "", available: true };

  const [address, favorites] = await Promise.all([
    prisma.address.findFirst({ where: { userId: customerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { locality: true, city: true, latitude: true, longitude: true } }),
    prisma.favoriteKitchen.findMany({ where: { customerId }, select: { kitchenId: true } }),
  ]);
  const customerPin = address?.latitude != null && address.longitude != null
    ? { latitude: Number(address.latitude), longitude: Number(address.longitude) }
    : undefined;
  const favoriteIds = new Set(favorites.map((favorite) => favorite.kitchenId));
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
  const menuWhere = { isAvailable: true, stockCount: { gt: 0 }, serviceDate: { gte: today, lte: weekEnd }, cycle: { status: "PUBLISHED" as const }, meal: { isAvailable: true } };
  const rows = await prisma.kitchen.findMany({
    where: {
      verificationStatus: "APPROVED", isAcceptingOrders: true, mother: { user: { status: "ACTIVE" } },
      // Match the order APIs' city rule, then check each kitchen's actual service radius.
      ...(address?.city ? { city: { equals: address.city, mode: "insensitive" as const } } : {}),
      latitude: { not: null }, longitude: { not: null }, menus: { some: menuWhere },
    },
    orderBy: [{ mother: { rating: "desc" } }, { name: "asc" }],
    select: {
      id: true, name: true, locality: true, city: true, cuisine: true, latitude: true, longitude: true, marketplaceRadiusMeters: true,
      mother: { select: { rating: true, user: { select: { name: true } } } },
      menus: { where: menuWhere, orderBy: [{ serviceDate: "asc" }, { meal: { name: "asc" } }], select: { id: true, serviceDate: true, deliveryTime: true, stockCount: true, meal: { select: { id: true, name: true, category: true, tier: true, components: true, price: true } } } },
    },
  });

  const kitchens: CustomerKitchen[] = rows.map((kitchen) => ({
    id: kitchen.id, name: kitchen.name, motherName: kitchen.mother.user.name, locality: kitchen.locality, city: kitchen.city,
    cuisine: kitchen.cuisine, rating: Number(kitchen.mother.rating), isFavorite: favoriteIds.has(kitchen.id),
    latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude), marketplaceRadiusKm: kitchen.marketplaceRadiusMeters / 1000,
    distanceKm: customerPin ? distanceMeters(customerPin, { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }) / 1000 : undefined,
    meals: kitchen.menus.filter((menu) => {
      const delivery = mealDeliveryInstant(menu.serviceDate, menu.deliveryTime);
      return menu.meal.components.length === 3 && mealPriceAllowed(menu.meal.tier, Number(menu.meal.price)) && delivery > now && delivery <= weekEnd;
    }).map((menu) => ({ id: menu.meal.id, menuId: menu.id, name: menu.meal.name, category: menu.meal.category, tier: menu.meal.tier, components: menu.meal.components, price: Number(menu.meal.price), serviceDate: menu.serviceDate.toISOString().slice(0, 10), deliveryTime: menu.deliveryTime, servings: menu.stockCount })),
  })).filter((kitchen) => kitchen.meals.length > 0 && (kitchen.distanceKm === undefined || kitchen.distanceKm <= kitchen.marketplaceRadiusKm!))
    .sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) || (a.distanceKm !== undefined && b.distanceKm !== undefined ? a.distanceKm - b.distanceKm : b.rating - a.rating));

  return { kitchens, hasDeliveryPin: Boolean(customerPin), deliveryArea: address ? [address.locality, address.city].filter(Boolean).join(", ") : "", available: true };
}
