import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { lockWallet, walletBalance, mealDeliveryInstant, distanceMeters, CUSTOMER_DELIVERY_RADIUS_METERS } from "@/lib/marketplace-rules";
import { componentsAllowed, slotAllowed } from "@/lib/service-windows";
import { ensurePilotWallet } from "@/lib/pilot-wallet";
import { lockCourier, DispatchError } from "@/lib/delivery-batches";
import { newHandoverNonce } from "@/lib/delivery-handover";
import { scheduleEntityPush } from "@/lib/web-push";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), menuId: z.string().uuid(), quantity: z.number().int().min(9).max(100), notes: z.string().trim().max(500).default("") }),
  z.object({ action: z.literal("quote"), id: z.string().uuid(), version: z.number().int(), agentId: z.string().uuid(), vehicle: z.string().trim().min(3).max(120), deliveryFee: z.number().min(0).max(5000), courierPay: z.number().min(9).max(5000) }),
  z.object({ action: z.enum(["kitchenAccept", "checkout", "dispatch", "cancel", "decline"]), id: z.string().uuid(), version: z.number().int() }),
]);
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || !["CUSTOMER", "MOTHER", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Sign in to view bulk bookings." }, { status: 403 });
  try {
    const kitchen = user.role === "MOTHER" ? await prisma.kitchen.findFirst({ where: { mother: { userId: user.id } } }) : null;
    const where = user.role === "CUSTOMER" ? { customerId: user.id } : user.role === "MOTHER" ? { kitchenId: kitchen?.id ?? "00000000-0000-0000-0000-000000000000" } : {};
    const rows = await prisma.bulkDeliveryRequest.findMany({ where, include: { order: { select: { orderNumber: true, status: true, delivery: { select: { status: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 });
    const [menus, couriers, names] = await Promise.all([
      prisma.menu.findMany({ where: { id: { in: rows.map(row => row.menuId) } }, select: { id: true, meal: { select: { name: true } }, kitchen: { select: { name: true } } } }),
      user.role === "ADMIN" ? prisma.deliveryAgentProfile.findMany({ where: { verificationStatus: "APPROVED", user: { status: "ACTIVE" } }, select: { id: true, vehicleType: true, user: { select: { name: true } } } }) : Promise.resolve([]),
      user.role === "ADMIN" ? prisma.user.findMany({ where: { id: { in: rows.map(row => row.customerId) } }, select: { id: true, name: true } }) : Promise.resolve([]),
    ]);
    return NextResponse.json({ requests: rows.map(row => ({ ...row, customerName: names.find(person => person.id === row.customerId)?.name, meal: menus.find(menu => menu.id === row.menuId)?.meal.name, kitchen: menus.find(menu => menu.id === row.menuId)?.kitchen.name })), couriers }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return serviceUnavailable(); }
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || !["CUSTOMER", "MOTHER", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Sign in to manage a bulk booking." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the booking quantity, vehicle and quote." }, { status: 400 });
  const x = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      if (x.action === "create") {
        if (user.role !== "CUSTOMER") throw new DispatchError("Only customers can request a bulk booking.");
        await lockWallet(tx, user.id);
        if (await tx.bulkDeliveryRequest.count({ where: { customerId: user.id, status: { in: ["KITCHEN_REVIEW", "OPERATIONS_REVIEW", "QUOTED"] } } }) >= 10) throw new DispatchError("Finish or cancel an earlier bulk request first.");
        const address = await tx.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
        const menu = await tx.menu.findUnique({ where: { id: x.menuId }, include: { meal: true, cycle: true, kitchen: { include: { mother: { include: { user: true } } } } } });
        if (!address || address.latitude === null || address.longitude === null || !menu || !menu.isAvailable || !menu.meal.isAvailable || menu.stockCount < x.quantity || menu.cycle.status !== "PUBLISHED" || (!menu.meal.oneTimeOnly && !componentsAllowed(menu.mealPeriod, menu.meal.components)) || !slotAllowed(menu.mealPeriod, menu.deliveryTime) || menu.kitchen.verificationStatus !== "APPROVED" || !menu.kitchen.isAcceptingOrders || menu.kitchen.mother.user.status !== "ACTIVE" || menu.kitchen.latitude === null || menu.kitchen.longitude === null) throw new DispatchError("Choose a published meal with enough servings and a saved delivery pin.");
        if (address.city.trim().toLowerCase() !== menu.kitchen.city.trim().toLowerCase() || distanceMeters({ latitude: Number(address.latitude), longitude: Number(address.longitude) }, { latitude: Number(menu.kitchen.latitude), longitude: Number(menu.kitchen.longitude) }) > CUSTOMER_DELIVERY_RADIUS_METERS) throw new DispatchError("Choose a kitchen within your delivery area.");
        const scheduledFor = mealDeliveryInstant(menu.serviceDate, menu.deliveryTime);
        if (scheduledFor.getTime() < Date.now() + 2 * 3600_000) throw new DispatchError("Bulk bookings require at least two hours for preparation and transport arrangements.");
        const row = await tx.bulkDeliveryRequest.create({ data: { customerId: user.id, kitchenId: menu.kitchenId, menuId: menu.id, addressId: address.id, quantity: x.quantity, unitPrice: menu.meal.price, notes: x.notes, scheduledFor } });
        await tx.notification.create({ data: { userId: menu.kitchen.mother.userId, title: "Bulk meal request", body: `${x.quantity} servings requested. Confirm kitchen capacity in Bulk bookings.`, kind: "ORDER", entityId: row.id } });
        return { id: row.id, message: "Request sent. The kitchen and operations will confirm capacity, vehicle and pricing before checkout." };
      }
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"bulk:" + x.id},0))`;
      const row = await tx.bulkDeliveryRequest.findUnique({ where: { id: x.id } });
      if (!row) throw new DispatchError("Bulk request not found.");
      const menu = await tx.menu.findUniqueOrThrow({ where: { id: row.menuId }, include: { meal: true, cycle: true, kitchen: { include: { mother: { include: { user: true } } } } } });
      const customer = row.customerId === user.id && user.role === "CUSTOMER";
      const mother = menu.kitchen.mother.userId === user.id && user.role === "MOTHER";
      const admin = user.role === "ADMIN";
      if (!customer && !mother && !admin) throw new DispatchError("This bulk request is unavailable.");
      if (x.action === "checkout" && customer && row.orderId) return { id: row.id, orderId: row.orderId, message: "This booking already has an order." };
      if (row.version !== x.version) throw new DispatchError("This booking changed. Refresh before continuing.");
      let status = row.status;
      let orderId: string | undefined;
      if (x.action === "kitchenAccept") {
        if (!mother || status !== "KITCHEN_REVIEW" || menu.stockCount < row.quantity) throw new DispatchError("Kitchen capacity confirmation is required.");
        status = "OPERATIONS_REVIEW";
      } else if (x.action === "quote") {
        if (!admin || !["OPERATIONS_REVIEW", "QUOTED"].includes(status)) throw new DispatchError("The kitchen must approve capacity before an operations quote.");
        const agent = await tx.deliveryAgentProfile.findFirst({ where: { id: x.agentId, verificationStatus: "APPROVED", user: { status: "ACTIVE" } } });
        if (!agent) throw new DispatchError("Choose an approved courier for the arranged vehicle.");
        await tx.bulkDeliveryRequest.update({ where: { id: row.id }, data: { status: "QUOTED", agentId: agent.id, vehicle: x.vehicle, deliveryFee: x.deliveryFee, courierPay: x.courierPay, expiresAt: new Date(Date.now() + 30 * 60_000), version: { increment: 1 } } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "BULK_QUOTE", entityType: "BulkDeliveryRequest", entityId: row.id, newValue: x } });
        await tx.notification.create({ data: { userId: row.customerId, title: "Your bulk quote is ready", body: `Review ${row.quantity} servings and ₹${x.deliveryFee} delivery within 30 minutes.`, kind: "ORDER", entityId: row.id } });
        return { id: row.id, message: "Vehicle and courier quote sent to the customer." };
      } else if (x.action === "checkout") {
        if (!customer || status !== "QUOTED" || !row.expiresAt || row.expiresAt <= new Date() || row.deliveryFee === null || !row.agentId) throw new DispatchError("Ask operations for a current bulk quote.");
        if (!menu.isAvailable || !menu.meal.isAvailable || menu.cycle.status !== "PUBLISHED" || !menu.kitchen.isAcceptingOrders || menu.kitchen.mother.user.status !== "ACTIVE" || Number(menu.meal.price) !== Number(row.unitPrice) || mealDeliveryInstant(menu.serviceDate, menu.deliveryTime).getTime() !== row.scheduledFor.getTime() || row.scheduledFor.getTime() < Date.now() + 30 * 60_000) throw new DispatchError("Meal price, availability or timing changed. Start a new bulk request.");
        await lockWallet(tx, user.id);
        await ensurePilotWallet(tx, user.id);
        const subtotal = Math.round(Number(row.unitPrice) * row.quantity * 100) / 100;
        const total = Math.round((subtotal + Number(row.deliveryFee)) * 100) / 100;
        const walletUsed = Math.min(await walletBalance(tx, user.id), total);
        const due = Math.round((total - walletUsed) * 100) / 100;
        const stock = await tx.menu.updateMany({ where: { id: menu.id, isAvailable: true, stockCount: { gte: row.quantity } }, data: { stockCount: { decrement: row.quantity } } });
        if (stock.count !== 1) throw new DispatchError("Those servings were reserved. No wallet credit was used.");
        const order = await tx.order.create({ data: { orderNumber: "PB-" + randomUUID().slice(0, 12).toUpperCase(), customerId: user.id, motherId: menu.kitchen.motherId, kitchenId: row.kitchenId, addressId: row.addressId, scheduledFor: row.scheduledFor, subtotal, deliveryFee: row.deliveryFee, totalAmount: total, status: "CONFIRMED", paymentStatus: due ? "PENDING" : "CAPTURED", policySnapshot: { bulk: true, vehicle: row.vehicle, cutoffHours: 5, operationFeeINR: 5 }, items: { create: { mealId: menu.mealId, mealName: menu.meal.name, quantity: row.quantity, unitPrice: row.unitPrice, lineTotal: subtotal, dietarySnapshot: { menuId: menu.id, bulk: true } } }, events: { create: { actorUserId: user.id, status: "CONFIRMED", detail: "Bulk booking confirmed after kitchen and arranged-vehicle quote acceptance." } }, ...(due ? { payments: { create: { provider: "not_configured", amount: due, status: "PENDING" } } } : {}) } });
        orderId = order.id;
        if (walletUsed) await tx.walletLedgerEntry.create({ data: { userId: user.id, orderId, direction: "DEBIT", amount: walletUsed, reference: "bulk:" + row.id, description: "Wallet applied to bulk booking " + order.orderNumber } });
        status = "BOOKED";
      } else if (x.action === "dispatch") {
        if (!admin || !row.orderId || status !== "BOOKED" || !row.agentId || row.courierPay === null) throw new DispatchError("Only operations can dispatch a confirmed bulk booking.");
        await lockWallet(tx, row.customerId);
        await lockCourier(tx, row.agentId);
        const agent = await tx.deliveryAgentProfile.findFirst({ where: { id: row.agentId, verificationStatus: "APPROVED", user: { status: "ACTIVE" } } });
        if(await tx.scoofooBooking.count({where:{courierId:row.agentId,status:{in:["CONFIRMED","READY","PICKED_UP","AT_SCHOOL","EXCEPTION"]}}}))throw new DispatchError("Complete the dedicated ScooFoo school route before bulk dispatch.");
        if (!agent || await tx.delivery.count({ where: { agentId: row.agentId, status: { notIn: ["DELIVERED", "CANCELLED", "FAILED"] } } })) throw new DispatchError("The arranged courier must be approved and free of other active deliveries.");
        const delivery = await tx.delivery.findUnique({ where: { orderId: row.orderId }, include: { order: true } });
        if (!delivery || delivery.agentId || delivery.order.status !== "READY_FOR_PICKUP") throw new DispatchError("The kitchen must mark this order ready before bulk dispatch.");
        const changed = await tx.delivery.updateMany({ where: { id: delivery.id, agentId: null, status: "ASSIGNED" }, data: { agentId: row.agentId, batchId: randomUUID(), status: "ACCEPTED", acceptedAt: new Date(), assignedAt: new Date(), estimatedPayout: row.courierPay, handoverNonce: newHandoverNonce(), estimationRule: { method: "ARRANGED_BULK", vehicle: row.vehicle } } });
        if (!changed.count) throw new DispatchError("This dispatch changed. Refresh before continuing.");
        await tx.order.update({ where: { id: row.orderId }, data: { status: "DELIVERY_ASSIGNED" } });
        await tx.orderEvent.create({ data: { orderId: row.orderId, actorUserId: user.id, status: "DELIVERY_ASSIGNED", detail: "Operations assigned the agreed bulk vehicle and courier." } });
        await tx.notification.create({ data: { userId: agent.userId, title: "Arranged bulk delivery assigned", body: `${row.quantity} servings · ${row.vehicle}. Open Your deliveries.`, kind: "DELIVERY", entityId: row.orderId } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "BULK_DISPATCH", entityType: "BulkDeliveryRequest", entityId: row.id, newValue: { agentId: row.agentId, vehicle: row.vehicle } } });
        status = "DISPATCHED";
        orderId = row.orderId;
      } else {
        if (!["KITCHEN_REVIEW", "OPERATIONS_REVIEW", "QUOTED"].includes(status) || (x.action === "cancel" ? !customer : !mother && !admin)) throw new DispatchError("Use the order cancellation policy for confirmed bookings.");
        status = x.action === "cancel" ? "CANCELLED" : "DECLINED";
      }
      await tx.bulkDeliveryRequest.update({ where: { id: row.id }, data: { status, version: { increment: 1 }, ...(orderId ? { orderId } : {}) } });
      await tx.notification.createMany({ data: [row.customerId, menu.kitchen.mother.userId].map(userId => ({ userId, title: "Bulk booking updated", body: status.replaceAll("_", " "), kind: "ORDER", entityId: orderId ?? row.id })) });
      return { id: row.id, orderId, message: "Bulk booking updated. Track the confirmed order in Orders." };
    });
    scheduleEntityPush([result.orderId ?? result.id]);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DispatchError) return NextResponse.json({ error: error.message }, { status: 409 });
    return serviceUnavailable();
  }
}
