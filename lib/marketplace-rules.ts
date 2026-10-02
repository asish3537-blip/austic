export const MEAL_PRICE_TIERS = {
  BASE: { label: "Base meal", startingPrice: 69, maxPrice: 500 },
  EGG: { label: "Egg meal", startingPrice: 79, maxPrice: 500 },
  CHEESE: { label: "Cheese meal", startingPrice: 89, maxPrice: 500 },
  CHICKEN: { label: "Chicken meal", startingPrice: 99, maxPrice: 100 },
} as const;

export const DELIVERY_FEE_INR = 30;
export const CANCELLATION_CUTOFF_HOURS = 5;
export const CANCELLATION_OPERATION_FEE_INR = 5;
export const DEFAULT_KITCHEN_RADIUS_METERS = 8_000;
const INDIA_OFFSET = "+05:30";

export type MealTierName = keyof typeof MEAL_PRICE_TIERS;

export function mealPriceAllowed(tier: string, price: number) {
  if (!(tier in MEAL_PRICE_TIERS)) return false;
  const rule = MEAL_PRICE_TIERS[tier as MealTierName];
  return price >= rule.startingPrice && price <= rule.maxPrice;
}

export function mealDeliveryInstant(serviceDate: Date, deliveryTime: string) {
  const day = serviceDate.toISOString().slice(0, 10);
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.test(deliveryTime) ? deliveryTime : "12:30";
  return new Date(`${day}T${time}:00${INDIA_OFFSET}`);
}

export function distanceMeters(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function lockWallet(tx: import("@/app/generated/prisma/client").Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

export async function walletBalance(tx: import("@/app/generated/prisma/client").Prisma.TransactionClient, userId: string) {
  const [credits, debits] = await Promise.all([
    tx.walletLedgerEntry.aggregate({ where: { userId, direction: "CREDIT" }, _sum: { amount: true } }),
    tx.walletLedgerEntry.aggregate({ where: { userId, direction: "DEBIT" }, _sum: { amount: true } }),
  ]);
  return Math.max(0, Number(credits._sum.amount ?? 0) - Number(debits._sum.amount ?? 0));
}
