import { createHash } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { allocateDiscount, couponDiscount, deliveryQuote } from "@/lib/dispatch-rules";
import { loadDispatchPolicy } from "@/lib/dispatch-policy";

type Tx = Prisma.TransactionClient;
export class CheckoutError extends Error {}
export type PricingInput = { target: string; food: number[]; distanceKm: number; couponCode?: string };
export type CheckoutPricing = {
  food: number[]; delivery: number[]; discounts: number[]; totals: number[];
  subtotal: number; deliveryFee: number; discount: number; total: number;
  couponId: string | null; couponCode: string; distanceKm: number;
  feeRule: { baseFee: number; includedKm: number; perKm: number; maximumFee: number; method: string };
};
const round = (value: number) => Math.round(value * 100) / 100;
export const inputHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function validateCoupon(tx: Tx, customerId: string, code: string, food: number, delivery: number) {
  if (!code) return null;
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"coupon:" + code},0))`;
  const coupon = await tx.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || coupon.endsAt <= now) throw new CheckoutError("This coupon is unavailable or has expired.");
  if (food < Number(coupon.minimumSpend)) throw new CheckoutError(`This coupon needs food worth at least ₹${coupon.minimumSpend}.`);
  const [totalUses, personalUses, earlierOrders] = await Promise.all([
    tx.couponRedemption.count({ where: { couponId: coupon.id } }),
    tx.couponRedemption.count({ where: { couponId: coupon.id, customerId } }),
    coupon.firstOrderOnly ? tx.order.count({ where: { customerId, status: { notIn: ["CANCELLED", "FAILED"] } } }) : Promise.resolve(0),
  ]);
  if (totalUses >= coupon.usageLimit || personalUses >= coupon.perCustomerLimit || earlierOrders > 0) throw new CheckoutError("This coupon's usage limit or first-order eligibility has been reached.");
  return { coupon, discount: couponDiscount(coupon.kind, Number(coupon.value), Number(coupon.maximumDiscount), food, delivery) };
}

export async function priceCheckout(tx: Tx, customerId: string, input: PricingInput, quoteId?: string): Promise<CheckoutPricing> {
  const code = (input.couponCode || "").trim().toUpperCase();
  const normalized = { ...input, couponCode: code };
  if (quoteId) {
    const quote = await tx.checkoutQuote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.customerId !== customerId || quote.inputHash !== inputHash(normalized) || quote.expiresAt <= new Date()) throw new CheckoutError("Your checkout quote changed or expired. Review the total again.");
    const saved = quote.payload as unknown as CheckoutPricing;
    const eligible = await validateCoupon(tx, customerId, code, saved.subtotal, saved.deliveryFee);
    if ((eligible?.discount ?? 0) !== saved.discount) throw new CheckoutError("Coupon terms changed. Review a fresh checkout quote.");
    return saved;
  }
  const policy = await loadDispatchPolicy();
  const food = input.food.map(round);
  const delivery = food.map(() => deliveryQuote(input.distanceKm, policy));
  const subtotal = round(food.reduce((a, b) => a + b, 0));
  const deliveryFee = round(delivery.reduce((a, b) => a + b, 0));
  const eligible = await validateCoupon(tx, customerId, code, subtotal, deliveryFee);
  const discount = eligible?.discount ?? 0;
  const discounts = allocateDiscount(discount, eligible?.coupon.kind === "DELIVERY" ? delivery : food);
  const totals = food.map((amount, index) => round(amount + delivery[index] - discounts[index]));
  return { food, delivery, discounts, totals, subtotal, deliveryFee, discount, total: round(subtotal + deliveryFee - discount), couponId: eligible?.coupon.id ?? null, couponCode: code, distanceKm: input.distanceKm, feeRule: { baseFee: policy.baseFee, includedKm: policy.includedKm, perKm: policy.perKm, maximumFee: policy.maximumFee, method: "STRAIGHT_LINE_DISTANCE" } };
}

export async function redeemCoupon(tx: Tx, customerId: string, pricing: CheckoutPricing, orderIds: string[]) {
  if (pricing.couponId) await tx.couponRedemption.create({ data: { couponId: pricing.couponId, customerId, amount: pricing.discount, orderIds } });
}

export async function previousCheckout<T = Record<string, unknown>>(tx: Tx, userId: string, quoteId: string | undefined, request: unknown) {
  if (!quoteId) return null;
  const receipt = await tx.checkoutReceipt.findUnique({ where: { id: `${userId}:${quoteId}` } });
  if (receipt && receipt.requestHash !== inputHash(request)) throw new CheckoutError("This quote was already used for another checkout.");
  return receipt?.response as T | null;
}

export async function saveCheckout(tx: Tx, userId: string, quoteId: string | undefined, request: unknown, response: unknown) {
  if (quoteId) await tx.checkoutReceipt.create({ data: { id: `${userId}:${quoteId}`, requestHash: inputHash(request), response: response as Prisma.InputJsonValue } });
}
