import { lockWallet } from "@/lib/marketplace-rules";
import { expireOverdueOrders } from "@/lib/overdue-orders";
import { randomUUID } from "node:crypto";
import { loadDispatchPolicy } from "@/lib/dispatch-policy";
import { batchRoute } from "@/lib/dispatch-rules";
import { assertBatchCapacity, deliveryStop, DispatchError, lockCourier } from "@/lib/delivery-batches";
import { newHandoverNonce } from "@/lib/delivery-handover";
import {canStartLocalDelivery} from "@/lib/service-windows";
import { loadEstimatePolicy, orderDistance } from "@/lib/partner-income";
import { estimateShares } from "@/lib/earnings-estimates";
import { courierCovers } from "@/lib/courier-offers";
import { scheduleEntityPush } from "@/lib/web-push";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
const claimSchema = z.object({ deliveryId: z.string().uuid().optional(), deliveryIds: z.array(z.string().uuid()).min(1).max(3).optional() }).refine(x => Boolean(x.deliveryId) !== Boolean(x.deliveryIds));

async function approvedAgent(userId: string) {
  return prisma.deliveryAgentProfile.findUnique({ where: { userId }, include: { user: { select: { status: true } } } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  try {
    await expireOverdueOrders();
    const agent = await approvedAgent(user.id);
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your delivery partner application still needs approval." }, { status: 403 });
    const policy = await loadEstimatePolicy();
    const dispatch = await loadDispatchPolicy();
    const [available, assigned, upcoming] = await Promise.all([
      !agent.isAvailable || !agent.serviceCity ? Promise.resolve([]) : prisma.delivery.findMany({
        where: { agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP", orderNumber: { not: { startsWith: "TEST-LIFE-" } }, bulkDeliveryRequest: null, kitchen: { city: { equals: agent.serviceCity, mode: "insensitive" } } } },
        orderBy: { createdAt: "asc" }, take: 100,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } } } } },
      }),
      prisma.delivery.findMany({
        where: { agentId: agent.id, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
        orderBy: { updatedAt: "desc" }, take: 20,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } }, bulkDeliveryRequest: {select:{id:true}} } } },
      }),
      !agent.isAvailable || !agent.serviceCity ? Promise.resolve([]) : prisma.order.findMany({ where: { bulkDeliveryRequest: null, status: { in: ["ORDER_PLACED","CONFIRMED","PREPARING"] }, orderNumber: { not: { startsWith: "TEST-LIFE-" } }, kitchen: { city: { equals: agent.serviceCity, mode: "insensitive" } }, scheduledFor: { gte: new Date(Date.now()-7200000), lte: new Date(Date.now()+7*86400000) } }, include: { kitchen: true, address: true, items: { select: { mealName:true,quantity:true } } }, orderBy: { orderedAt:"desc" },take:100 }),
    ]);
    const route = batchRoute(assigned.map(d => deliveryStop(d.id, d.order)));
    const zones = await prisma.kitchen.findMany({ where: { verificationStatus: "APPROVED", isAcceptingOrders: true, latitude: { not: null }, longitude: { not: null }, mother: { user: { status: "ACTIVE" } } }, select: { id: true, name: true, locality: true, city: true }, take: 100, orderBy: { name: "asc" } });
    const mapJob = (delivery: typeof available[number], isAssigned: boolean) => ({
      estimatedPay: estimateShares(Number(delivery.order.subtotal), Number(delivery.order.deliveryFee), orderDistance(delivery.order.kitchen, delivery.order.address), policy, delivery.estimatedPayout == null ? null : Number(delivery.estimatedPayout)).courier,
      routeDistanceKm: orderDistance(delivery.order.kitchen, delivery.order.address), alertAt: delivery.updatedAt.toISOString(), isUpcoming: false,
      batchId: delivery.batchId, mealCount: delivery.order.items.reduce((sum, item) => sum + item.quantity, 0),
      deliveryId: delivery.id, orderId: delivery.order.id, orderNumber: delivery.order.orderNumber,
      deliveryStatus: delivery.status, orderStatus: delivery.order.status, trackingReference: delivery.trackingReference,
      pickup: delivery.order.kitchen.name + " · " + delivery.order.kitchen.locality,
      dropoff: isAssigned ? delivery.order.address.addressLine1 + ", " + delivery.order.address.locality + ", " + delivery.order.address.city : delivery.order.address.locality + ", " + delivery.order.address.city,
      items: delivery.order.items.map((item) => item.quantity + " × " + item.mealName),
      scheduledFor: delivery.order.scheduledFor.toISOString(),
      pickupPinned: delivery.order.kitchen.latitude !== null && delivery.order.kitchen.longitude !== null,
      dropoffPinned: delivery.order.address.latitude !== null && delivery.order.address.longitude !== null,
      isSharingLocation: Boolean(delivery.locationConsentAt),
      pickupNavigation: !isAssigned ? null : delivery.order.kitchen.latitude !== null && delivery.order.kitchen.longitude !== null
        ? `${delivery.order.kitchen.latitude},${delivery.order.kitchen.longitude}`
        : [delivery.order.kitchen.addressLine1, delivery.order.kitchen.locality, delivery.order.kitchen.city, delivery.order.kitchen.pinCode].join(", "),
      dropoffNavigation: !isAssigned ? null : delivery.order.address.latitude !== null && delivery.order.address.longitude !== null
        ? `${delivery.order.address.latitude},${delivery.order.address.longitude}`
        : [delivery.order.address.addressLine1, delivery.order.address.locality, delivery.order.address.city, delivery.order.address.pinCode].join(", "),
    });
    return NextResponse.json({ userScope: user.id, policy, dispatch, zones, route: route.filter(stop=>stop.kind!=="PICKUP"||assigned.some(d=>d.id===stop.id&&["ACCEPTED","GOING_TO_PICKUP"].includes(d.status))), capacity: { arrangedBulk: assigned.some(d => Boolean(d.order.bulkDeliveryRequest)), maxOrders: 3, mealCapacity: agent.mealCapacity, activeOrders: assigned.length, activeMeals: assigned.reduce((sum, d) => sum + d.order.items.reduce((n, item) => n + item.quantity, 0), 0) }, area: { online: agent.isAvailable, city: agent.serviceCity || "", radiusKm: agent.serviceRadiusMeters/1000 }, available: available.filter(d=>courierCovers(agent,d.order.kitchen)&&canStartLocalDelivery()).slice(0,20).map((delivery) => mapJob(delivery, false)), assigned: assigned.map((delivery) => mapJob(delivery, true)), upcoming: upcoming.filter(o=>courierCovers(agent,o.kitchen)).slice(0,20).map(o=>({ deliveryId:"upcoming:"+o.id,orderId:o.id,orderNumber:o.orderNumber,deliveryStatus:"UPCOMING",orderStatus:o.status,trackingReference:null,pickup:o.kitchen.name+" · "+o.kitchen.locality,dropoff:o.address.locality+", "+o.address.city,items:o.items.map(i=>i.quantity+" × "+i.mealName),scheduledFor:o.scheduledFor.toISOString(),pickupPinned:o.kitchen.latitude!==null,dropoffPinned:o.address.latitude!==null,isSharingLocation:false,pickupNavigation:null,dropoffNavigation:null,estimatedPay:estimateShares(Number(o.subtotal),Number(o.deliveryFee),orderDistance(o.kitchen,o.address),policy).courier,routeDistanceKm:orderDistance(o.kitchen,o.address),alertAt:o.orderedAt.toISOString(),isUpcoming:true})) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Paustik delivery jobs could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose a delivery job." }, { status: 400 }); }
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid delivery job." }, { status: 400 });
  try {
    const agent = await approvedAgent(user.id);
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your delivery partner application still needs approval." }, { status: 403 });
    const ids = [...new Set(parsed.data.deliveryIds ?? [parsed.data.deliveryId!])].sort();
    if (!canStartLocalDelivery()) throw new DispatchError("New pickups close at 20:30 IST. Contact operations for a late order.");
    const policy = await loadEstimatePolicy();
    const dispatch = await loadDispatchPolicy();
    const acceptedOrderIds = await prisma.$transaction(async tx => {
      const customers = await tx.delivery.findMany({ where: { id: { in: ids } }, select: { order: { select: { customerId: true } } } });
      for (const customerId of [...new Set(customers.map(d=>d.order.customerId))].sort()) await lockWallet(tx, customerId);
      await lockCourier(tx, agent.id);
      const candidates = await tx.delivery.findMany({ where: { id: { in: ids } }, include: { order: { include: { kitchen: true, address: true, items: true, bulkDeliveryRequest: true } } } });
      if (candidates.length !== ids.length) throw new DispatchError("One of these delivery requests is unavailable.");
      if (candidates.every(d => d.agentId === agent.id && ["ACCEPTED", "GOING_TO_PICKUP"].includes(d.status))) return candidates.map(d => d.orderId);
      if (candidates.some(d => d.agentId || d.status !== "ASSIGNED" || d.order.status !== "READY_FOR_PICKUP" || d.order.bulkDeliveryRequest || d.order.orderNumber.startsWith("TEST-LIFE-") || !courierCovers(agent, d.order.kitchen))) throw new DispatchError("One job changed or needs a separately arranged bulk delivery. Refresh your offers.");
      const active = await assertBatchCapacity(tx, agent.id, candidates, agent.mealCapacity, dispatch);
      const batchId = active[0]?.batchId ?? randomUUID();
      await tx.delivery.updateMany({ where: { id: { in: active.map(d => d.id) } }, data: { batchId } });
      for (const candidate of candidates) {
        const km = orderDistance(candidate.order.kitchen, candidate.order.address);
        const pay = estimateShares(Number(candidate.order.subtotal), Number(candidate.order.deliveryFee), km, policy).courier;
        const claimed = await tx.delivery.updateMany({ where: { id: candidate.id, agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP" } }, data: { batchId, handoverNonce: newHandoverNonce(), estimatedPayout: pay, estimatedDistanceKm: km, estimationRule: { ...policy, method: "STRAIGHT_LINE_ESTIMATE" }, agentId: agent.id, status: "ACCEPTED", acceptedAt: new Date(), assignedAt: new Date() } });
        if (claimed.count !== 1) throw new DispatchError("Another courier accepted one of these orders. No part of this batch was assigned.");
        await tx.order.update({ where: { id: candidate.orderId }, data: { status: "DELIVERY_ASSIGNED" } });
        await tx.orderEvent.create({ data: { orderId: candidate.orderId, actorUserId: user.id, status: "DELIVERY_ASSIGNED", detail: "Courier accepted this order in a local collection batch." } });
        await tx.notification.createMany({ data: [
          { userId: candidate.order.customerId, title: "Courier assigned", body: "Your courier is collecting your order " + candidate.order.orderNumber + ". Track each step in Orders.", kind: "DELIVERY", entityId: candidate.orderId },
          { userId: user.id, title: "Delivery accepted", body: candidate.order.orderNumber + " added to your collection route.", kind: "DELIVERY", entityId: candidate.orderId },
        ] });
      }
      return candidates.map(d => d.orderId);
    });
    scheduleEntityPush(acceptedOrderIds);
    return NextResponse.json({ accepted: true, orderIds: acceptedOrderIds });
  } catch (error) {
    if (error instanceof DispatchError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "JOB_ALREADY_CLAIMED") return NextResponse.json({ error: "Another courier accepted this delivery first." }, { status: 409 });
    console.error("Paustik delivery claim failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
