export type EstimatePolicy = { motherBasisPoints: number; courierBase: number; includedKm: number; perKm: number; courierCap: number };
export const DEFAULT_ESTIMATE_POLICY: EstimatePolicy = { motherBasisPoints: 8000, courierBase: 9, includedKm: 2, perKm: 3, courierCap: 60 };
export const moneyPaise = (rupees: number) => Math.round(rupees * 100);
export function estimateShares(food: number, deliveryCharge: number, km: number | null, policy = DEFAULT_ESTIMATE_POLICY, acceptedCourierEstimate?: number | null) {
  const motherPaise = Math.round(moneyPaise(food) * policy.motherBasisPoints / 10000);
  const courierPaise = acceptedCourierEstimate != null ? moneyPaise(acceptedCourierEstimate) : Math.min(moneyPaise(policy.courierCap), moneyPaise(policy.courierBase) + Math.round(Math.max(0, (km ?? 0) - policy.includedKm) * moneyPaise(policy.perKm)));
  return { mother: motherPaise / 100, courier: courierPaise / 100, retained: (moneyPaise(food) + moneyPaise(deliveryCharge) - motherPaise - courierPaise) / 100, distanceKnown: km !== null };
}
export const incomeMoney = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
