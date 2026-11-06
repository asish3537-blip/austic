import {hasOnlineCourier,NO_COURIER_MESSAGE} from "@/lib/delivery-availability";
import {slotAllowed,componentsAllowed,DELIVERY_WINDOW_POLICY} from "@/lib/service-windows";
import { scheduleCourierOffers } from "@/lib/courier-offers";
import { scheduleEntityPush } from "@/lib/web-push";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ensurePilotWallet } from "@/lib/pilot-wallet";
import { CUSTOMER_DELIVERY_RADIUS_METERS, CANCELLATION_CUTOFF_HOURS, CANCELLATION_OPERATION_FEE_INR, DELIVERY_FEE_INR, distanceMeters, lockWallet, mealDeliveryInstant, mealPriceAllowed, walletBalance } from "@/lib/marketplace-rules";

export const runtime = "nodejs";
const orderSchema = z.object({ menuId: z.string().uuid(), quantity: z.number().int().min(1).max(8) });

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in with an active customer account to place an order." }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose a meal and quantity." }, { status: 400 }); }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid menu item and quantity." }, { status: 400 });

  try {
    const [address, menu] = await Promise.all([
      prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      prisma.menu.findUnique({
        where: { id: parsed.data.menuId },
        include: { meal: true, cycle: true, kitchen: { include: { mother: { include: { user: true } } } } },
      }),
    ]);
    if (!address) return NextResponse.json({ error: "Add a delivery address to your account before placing an order." }, { status: 409 });
    if (!menu || !menu.isAvailable || !menu.meal.isAvailable || menu.stockCount < parsed.data.quantity || menu.cycle.status !== "PUBLISHED") {
      return NextResponse.json({ error: "That meal is no longer available. Refresh the menu and choose another serving." }, { status: 409 });
    }
    if (!componentsAllowed(menu.mealPeriod,menu.meal.components) || !mealPriceAllowed(menu.meal.tier, Number(menu.meal.price))) return NextResponse.json({ error: "This older menu needs a mother update before orders can be accepted. Choose a three-part meal with a current tier price." }, { status: 409 });
    if (menu.kitchen.verificationStatus !== "APPROVED" || !menu.kitchen.isAcceptingOrders || menu.kitchen.mother.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "This kitchen is not accepting orders right now." }, { status: 409 });
    }
    if (menu.kitchen.latitude === null || menu.kitchen.longitude === null) {
      return NextResponse.json({ error: "This kitchen is still setting its pickup pin. Try another nearby kitchen." }, { status: 409 });
    }
    if (address.latitude === null || address.longitude === null) {
      return NextResponse.json({ error: "Set your delivery pin before checkout so the courier can use the delivery geofence." }, { status: 409 });
    }
    const kitchenCity = menu.kitchen.city.trim().toLocaleLowerCase("en-IN");
    if (address.city.trim() && address.city.trim().toLocaleLowerCase("en-IN") !== kitchenCity) {
      return NextResponse.json({ error: "This kitchen currently serves " + menu.kitchen.city + ". Choose a kitchen serving your delivery city." }, { status: 409 });
    }
    const kitchenDistance = distanceMeters({ latitude: Number(address.latitude), longitude: Number(address.longitude) }, { latitude: Number(menu.kitchen.latitude), longitude: Number(menu.kitchen.longitude) });
    if (kitchenDistance > CUSTOMER_DELIVERY_RADIUS_METERS) return NextResponse.json({ error: "This kitchen is outside its " + (CUSTOMER_DELIVERY_RADIUS_METERS / 1000).toFixed(1) + " km neighbourhood delivery area." }, { status: 409 });
    const subtotal = Number(menu.meal.price) * parsed.data.quantity;
    const total = subtotal + DELIVERY_FEE_INR;
    const scheduledFor = mealDeliveryInstant(menu.serviceDate, menu.deliveryTime);
    if (!slotAllowed(menu.mealPeriod,menu.deliveryTime)||scheduledFor.getTime()<Date.now()+30*60000) return NextResponse.json({ error: "Choose a valid meal period and delivery at least 30 minutes ahead. Dinner ends at 21:00 IST." }, { status: 409 });
    const orderNumber = "PS-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(2).toString("hex").toUpperCase();
    const order = await prisma.$transaction(async (tx) => {
      if(!await hasOnlineCourier(menu.kitchen,tx))throw new Error("NO_COURIER");
      await lockWallet(tx, user.id);
      await ensurePilotWallet(tx, user.id);
      const walletUsed = Math.min(await walletBalance(tx, user.id), total);
      const amountDue = total - walletUsed;
      const reserved = await tx.menu.updateMany({
        where: { id: menu.id, isAvailable: true, stockCount: { gte: parsed.data.quantity } },
        data: { stockCount: { decrement: parsed.data.quantity } },
      });
      if (reserved.count !== 1) throw new Error("MENU_SOLD_OUT");
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: user.id,
          motherId: menu.kitchen.motherId,
          kitchenId: menu.kitchenId,
          addressId: address.id,
          status: "ORDER_PLACED",
          paymentStatus: amountDue === 0 ? "CAPTURED" : "PENDING",
          scheduledFor,
          subtotal,
          deliveryFee: DELIVERY_FEE_INR,
          taxAmount: 0,
          totalAmount: total,
          currency: "INR",
          policySnapshot: { ...DELIVERY_WINDOW_POLICY, mealPeriod:menu.mealPeriod, cancellation: "Cancel at least five hours before the scheduled delivery. Eligible collected value less a ₹5 processing fee is returned to wallet.", cutoffHours: CANCELLATION_CUTOFF_HOURS, operationFeeINR: CANCELLATION_OPERATION_FEE_INR, paymentMode: "PAYMENT_PROVIDER_NOT_CONFIGURED" },
          items: { create: { mealId: menu.mealId, mealName: menu.meal.name, quantity: parsed.data.quantity, unitPrice: menu.meal.price, lineTotal: subtotal, dietarySnapshot: { category: menu.meal.category, tier: menu.meal.tier, components: menu.meal.components, allergens: menu.meal.allergens, menuId: menu.id,mealPeriod:menu.mealPeriod } } },
          ...(amountDue > 0 ? { payments: { create: { provider: "not_configured", status: "PENDING", amount: amountDue, currency: "INR" } } } : {}),
          events: { create: { actorUserId: user.id, status: "ORDER_PLACED", detail: amountDue === 0 ? "Customer used wallet credit to settle this order." : "Customer placed a marketplace order. Remaining payment is not collected in the app." } },
        },
      });
      if (walletUsed > 0) await tx.walletLedgerEntry.create({ data: { userId: user.id, orderId: created.id, direction: "DEBIT", amount: walletUsed, reference: "order:" + created.id, description: "Wallet applied to " + created.orderNumber } });
      await tx.notification.create({
        data: { userId: menu.kitchen.mother.userId, title: "New meal order", body: orderNumber + " · " + parsed.data.quantity + " serving(s) of " + menu.meal.name, kind: "ORDER", entityId: created.id },
      });
      await tx.notification.create({ data: { userId: user.id, title: "Meal order placed", body: "Your order " + created.orderNumber + " is saved. Follow it in Your orders & tracking.", kind: "ORDER", entityId: created.id } });
      return created;
    });
    scheduleEntityPush([order.id]);
    scheduleCourierOffers([order.id]);
    const walletApplied = await prisma.walletLedgerEntry.aggregate({ where: { orderId: order.id, direction: "DEBIT" }, _sum: { amount: true } });
    return NextResponse.json({ created: true, orderId: order.id, orderNumber: order.orderNumber, total, walletApplied: Number(walletApplied._sum.amount ?? 0), amountDue: Math.max(0, total - Number(walletApplied._sum.amount ?? 0)), currency: "INR", paymentStatus: order.paymentStatus, message: "Order saved. Online payment is not connected; any remaining balance has not been charged." }, { status: 201 });
  } catch (error) {
    if(error instanceof Error && error.message === "NO_COURIER")return NextResponse.json({error:NO_COURIER_MESSAGE},{status:409});
    if (error instanceof Error && error.message === "MENU_SOLD_OUT") return NextResponse.json({ error: "That meal just sold out. Refresh the menu to see remaining servings." }, { status: 409 });
    console.error("Paustik order creation failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
