import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { CANCELLATION_CUTOFF_HOURS, CANCELLATION_OPERATION_FEE_INR, DELIVERY_FEE_INR, distanceMeters, lockWallet, mealDeliveryInstant, mealPriceAllowed, walletBalance } from "@/lib/marketplace-rules";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const subscriptionSchema = z.object({ menuIds: z.array(z.string().uuid()).min(3).max(7), quantity: z.number().int().min(1).max(6).default(1) });

function orderNumber() {
  return "PS-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(2).toString("hex").toUpperCase();
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Sign in with an active customer account to start a meal plan." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose at least three available menu days." }, { status: 400 }); }
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Choose 3 to 7 days from one kitchen." }, { status: 400 });

  try {
    const [address, menus] = await Promise.all([
      prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      prisma.menu.findMany({ where: { id: { in: parsed.data.menuIds } }, include: { meal: true, cycle: true, kitchen: { include: { mother: { include: { user: true } } } } } }),
    ]);
    if (!address) return NextResponse.json({ error: "Add a delivery address before selecting a weekly meal plan." }, { status: 409 });
    if (address.latitude === null || address.longitude === null) return NextResponse.json({ error: "Set your delivery pin before choosing a meal plan." }, { status: 409 });
    if (menus.length !== parsed.data.menuIds.length) return NextResponse.json({ error: "One of those menu days is no longer available. Refresh and choose again." }, { status: 409 });
    const kitchenId = menus[0]?.kitchenId;
    if (!kitchenId || menus.some((menu) => menu.kitchenId !== kitchenId)) return NextResponse.json({ error: "A weekly plan must be from one mother-led kitchen." }, { status: 400 });
    const kitchen = menus[0]!.kitchen;
    if (kitchen.verificationStatus !== "APPROVED" || !kitchen.isAcceptingOrders || kitchen.mother.user.status !== "ACTIVE" || kitchen.latitude === null || kitchen.longitude === null) {
      return NextResponse.json({ error: "This kitchen is not ready to accept a weekly plan." }, { status: 409 });
    }
    if (address.city.trim().toLocaleLowerCase("en-IN") !== kitchen.city.trim().toLocaleLowerCase("en-IN")) return NextResponse.json({ error: "This kitchen currently serves " + kitchen.city + ". Choose a kitchen serving your delivery city." }, { status: 409 });
    const distance = distanceMeters({ latitude: Number(address.latitude), longitude: Number(address.longitude) }, { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) });
    if (distance > kitchen.marketplaceRadiusMeters) return NextResponse.json({ error: "This kitchen is outside its " + (kitchen.marketplaceRadiusMeters / 1000).toFixed(1) + " km neighbourhood delivery area." }, { status: 409 });
    const sorted = [...menus].sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime());
    if (new Set(sorted.map((menu) => menu.serviceDate.toISOString().slice(0, 10))).size !== sorted.length) return NextResponse.json({ error: "Choose one meal on each selected day." }, { status: 400 });
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const menu of sorted) {
      const scheduledFor = mealDeliveryInstant(menu.serviceDate, menu.deliveryTime);
      if (menu.meal.components.length !== 3 || !mealPriceAllowed(menu.meal.tier, Number(menu.meal.price))) return NextResponse.json({ error: "A selected menu needs a mother update before it can be reserved. Choose a three-part meal with a current tier price." }, { status: 409 });
      if (!menu.isAvailable || !menu.meal.isAvailable || menu.stockCount < parsed.data.quantity || menu.cycle.status !== "PUBLISHED" || scheduledFor <= now || scheduledFor > weekEnd) {
        return NextResponse.json({ error: "Weekly plans need available menus for upcoming delivery days. Refresh the kitchen menu." }, { status: 409 });
      }
    }
    const subtotal = sorted.reduce((total, menu) => total + Number(menu.meal.price) * parsed.data.quantity, 0);
    const total = subtotal + DELIVERY_FEE_INR * sorted.length;
    const dayNames = sorted.map((menu) => new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" }).format(menu.serviceDate));
    const result = await prisma.$transaction(async (tx) => {
      await lockWallet(tx, user.id);
      let remainingWallet = await walletBalance(tx, user.id);
      const plan = await tx.mealPlan.create({ data: {
        name: kitchen.name + " · " + sorted.length + " day plan",
        description: "One-week reservation with selected daily meals. Renew manually; this pilot does not auto-renew.",
        cadence: "WEEKLY", mealCount: sorted.length, price: total, currency: "INR",
      } });
      const firstDelivery = mealDeliveryInstant(sorted[0]!.serviceDate, sorted[0]!.deliveryTime);
      const lastDelivery = mealDeliveryInstant(sorted[sorted.length - 1]!.serviceDate, sorted[sorted.length - 1]!.deliveryTime);
      const subscription = await tx.subscription.create({ data: {
        customerId: user.id, mealPlanId: plan.id, kitchenId,
        weeklyDays: dayNames, cancellationCutoffHours: CANCELLATION_CUTOFF_HOURS,
        cancellationOperationFee: CANCELLATION_OPERATION_FEE_INR,
        startsAt: firstDelivery, endsAt: lastDelivery,
        preferences: { menuIds: sorted.map((menu) => menu.id), servingsPerDay: parsed.data.quantity, renewal: "MANUAL" },
        policySnapshot: { cutoffHours: CANCELLATION_CUTOFF_HOURS, operationFeeINR: CANCELLATION_OPERATION_FEE_INR, dailyDeliveryFeeINR: DELIVERY_FEE_INR },
      } });
      const createdOrders = [];
      for (const menu of sorted) {
        const scheduledFor = mealDeliveryInstant(menu.serviceDate, menu.deliveryTime);
        const reserved = await tx.menu.updateMany({ where: { id: menu.id, isAvailable: true, stockCount: { gte: parsed.data.quantity } }, data: { stockCount: { decrement: parsed.data.quantity } } });
        if (reserved.count !== 1) throw new Error("MENU_SOLD_OUT");
        const daySubtotal = Number(menu.meal.price) * parsed.data.quantity;
        const dayTotal = daySubtotal + DELIVERY_FEE_INR;
        const walletUsed = Math.min(remainingWallet, dayTotal);
        remainingWallet -= walletUsed;
        const due = dayTotal - walletUsed;
        const id = orderNumber();
        const created = await tx.order.create({ data: {
          orderNumber: id, customerId: user.id, motherId: kitchen.motherId, kitchenId, addressId: address.id, subscriptionId: subscription.id,
          status: "ORDER_PLACED", paymentStatus: due === 0 ? "CAPTURED" : "PENDING", scheduledFor,
          subtotal: daySubtotal, deliveryFee: DELIVERY_FEE_INR, taxAmount: 0, totalAmount: dayTotal, currency: "INR",
          policySnapshot: { cutoffHours: CANCELLATION_CUTOFF_HOURS, operationFeeINR: CANCELLATION_OPERATION_FEE_INR, cancellation: "Cancel at least five hours before delivery; eligible paid value less the ₹5 processing fee returns to wallet." },
          items: { create: { mealId: menu.mealId, mealName: menu.meal.name, quantity: parsed.data.quantity, unitPrice: menu.meal.price, lineTotal: daySubtotal, dietarySnapshot: { category: menu.meal.category, tier: menu.meal.tier, components: menu.meal.components, allergens: menu.meal.allergens, menuId: menu.id } } },
          ...(due > 0 ? { payments: { create: { provider: "not_configured", status: "PENDING", amount: due, currency: "INR" } } } : {}),
          events: { create: { actorUserId: user.id, status: "ORDER_PLACED", detail: due === 0 ? "Weekly meal day reserved using existing wallet credit." : "Weekly meal day reserved. Remaining payment is collected outside the app during this pilot." } },
        } });
        if (walletUsed > 0) await tx.walletLedgerEntry.create({ data: {
          userId: user.id, orderId: created.id, subscriptionId: subscription.id, direction: "DEBIT", amount: walletUsed,
          reference: "subscription:" + subscription.id + ":order:" + created.id, description: "Wallet applied to " + created.orderNumber,
        } });
        if (due > 0) await tx.notification.create({ data: { userId: user.id, title: "Payment due for weekly meal", body: "₹" + due.toFixed(0) + " remains due for " + created.orderNumber + ". No online payment was taken.", kind: "PAYMENT", entityId: created.id } });
        await tx.notification.create({ data: { userId: kitchen.mother.userId, title: "Weekly meal reserved", body: created.orderNumber + " · " + parsed.data.quantity + " serving(s) of " + menu.meal.name, kind: "ORDER", entityId: created.id } });
        createdOrders.push({ id: created.id, orderNumber: created.orderNumber, scheduledFor: scheduledFor.toISOString(), amountDue: due });
      }
      return { subscriptionId: subscription.id, orders: createdOrders };
    });
    return NextResponse.json({ created: true, ...result, message: "Your one-week plan is saved for " + sorted.length + " delivery days. Renew manually next week; no automatic payment is scheduled." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "MENU_SOLD_OUT") return NextResponse.json({ error: "One selected day sold out while the plan was being saved. Refresh the menu and try again." }, { status: 409 });
    console.error("Pausstik weekly subscription creation failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
