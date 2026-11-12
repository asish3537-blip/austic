import { distanceMeters } from "@/lib/marketplace-rules";

export type DispatchSettings = {
  baseFee: number;
  includedKm: number;
  perKm: number;
  maximumFee: number;
  handoverRadiusMeters: number;
  allowGpsHandover: boolean;
  batchRadiusMeters: number;
  batchWindowMinutes: number;
};
export const DEFAULT_DISPATCH: DispatchSettings = {
  baseFee: 9, includedKm: 1, perKm: 5, maximumFee: 150,
  handoverRadiusMeters: 100, allowGpsHandover: true,
  batchRadiusMeters: 2000, batchWindowMinutes: 30,
};
export const ACTIVE_DELIVERY_STATES = ["ACCEPTED", "GOING_TO_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"] as const;
export const MAX_BATCH_ORDERS = 3;
export type DeliveryStop = {
  id: string;
  quantity: number;
  scheduledFor: Date;
  pickup: { latitude: number; longitude: number };
  dropoff: { latitude: number; longitude: number };
};

export function deliveryQuote(distanceKm: number, policy = DEFAULT_DISPATCH) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("A valid delivery distance is required.");
  return Math.round(Math.min(policy.maximumFee, policy.baseFee + Math.max(0, distanceKm - policy.includedKm) * policy.perKm) * 100) / 100;
}

export function batchProblem(stops: DeliveryStop[], mealCapacity: number, policy = DEFAULT_DISPATCH) {
  if (stops.length > MAX_BATCH_ORDERS) return "A local batch can contain at most three orders.";
  if (stops.reduce((sum, stop) => sum + stop.quantity, 0) > mealCapacity) return "This batch exceeds your carrying capacity. Request a bulk arrangement.";
  for (let index = 0; index < stops.length; index++) {
    for (const other of stops.slice(index + 1)) {
      const stop = stops[index];
      if (Math.abs(stop.scheduledFor.getTime() - other.scheduledFor.getTime()) > policy.batchWindowMinutes * 60_000) return "Choose orders in the same delivery time window.";
      if (distanceMeters(stop.pickup, other.pickup) > policy.batchRadiusMeters || distanceMeters(stop.dropoff, other.dropoff) > policy.batchRadiusMeters) return "Batch pickup and drop-off points must be within 2 km of each other.";
    }
  }
  return null;
}

// A short sequence is sufficient for the three-order limit. Every pickup precedes every drop-off.
export function batchRoute(stops: DeliveryStop[]) {
  const remaining = [...stops].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime() || a.id.localeCompare(b.id));
  const pickups = remaining.map(stop => ({ id: stop.id, kind: "PICKUP" as const }));
  let position = remaining.at(-1)?.pickup;
  const drops: { id: string; kind: "DELIVERY" }[] = [];
  while (remaining.length && position) {
    const origin = position;
    remaining.sort((a, b) => distanceMeters(origin, a.dropoff) - distanceMeters(origin, b.dropoff));
    const next = remaining.shift()!;
    drops.push({ id: next.id, kind: "DELIVERY" });
    position = next.dropoff;
  }
  return [...pickups, ...drops];
}

export function couponDiscount(kind: string, value: number, cap: number, food: number, delivery: number) {
  const basis = kind === "DELIVERY" ? delivery : food;
  const requested = kind === "PERCENT" ? Math.floor(Math.round(food * 100) * value / 100) / 100 : value;
  return Math.round(Math.max(0, Math.min(basis, cap, requested)) * 100) / 100;
}

export function allocateDiscount(amount: number, bases: number[]) {
  const total = bases.reduce((sum, value) => sum + Math.round(value * 100), 0);
  let remaining = Math.round(amount * 100);
  return bases.map((basis, index) => {
    const paise = index === bases.length - 1 ? remaining : Math.min(remaining, Math.floor(Math.round(amount * 100) * Math.round(basis * 100) / Math.max(1, total)));
    remaining -= paise;
    return paise / 100;
  });
}
