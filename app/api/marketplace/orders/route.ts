import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const orderSchema = z.object({ menuId: z.string().uuid(), quantity: z.number().int().min(1).max(8) });
const DELIVERY_FEE_INR = 30;

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
    const subtotal = Number(menu.meal.price) * parsed.data.quantity;
    const total = subtotal + DELIVERY_FEE_INR;
    const orderNumber = "PS-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(2).toString("hex").toUpperCase();
    const order = await prisma.$transaction(async (tx) => {
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
          paymentStatus: "PENDING",
          scheduledFor: menu.serviceDate,
          subtotal,
          deliveryFee: DELIVERY_FEE_INR,
          taxAmount: 0,
          totalAmount: total,
          currency: "INR",
          policySnapshot: { cancellation: "Contact Pausstik support for this pilot order.", paymentMode: "PAYMENT_PROVIDER_NOT_CONFIGURED" },
          items: { create: { mealId: menu.mealId, mealName: menu.meal.name, quantity: parsed.data.quantity, unitPrice: menu.meal.price, lineTotal: subtotal, dietarySnapshot: { category: menu.meal.category, allergens: menu.meal.allergens } } },
          payments: { create: { provider: "not_configured", status: "PENDING", amount: total, currency: "INR" } },
          events: { create: { actorUserId: user.id, status: "ORDER_PLACED", detail: "Customer placed a marketplace order. Payment provider is not connected." } },
        },
      });
      await tx.notification.create({
        data: { userId: menu.kitchen.mother.userId, title: "New meal order", body: orderNumber + " · " + parsed.data.quantity + " serving(s) of " + menu.meal.name, kind: "ORDER", entityId: created.id },
      });
      return created;
    });
    return NextResponse.json({ created: true, orderId: order.id, orderNumber: order.orderNumber, total, currency: "INR", paymentStatus: "PENDING", message: "Order saved. Online payment is not connected yet; this demo has not charged you." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "MENU_SOLD_OUT") return NextResponse.json({ error: "That meal just sold out. Refresh the menu to see remaining servings." }, { status: 409 });
    console.error("Pausstik order creation failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
