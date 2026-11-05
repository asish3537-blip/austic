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
const claimSchema = z.object({ deliveryId: z.string().uuid() });

async function approvedAgent(userId: string) {
  return prisma.deliveryAgentProfile.findUnique({ where: { userId }, include: { user: { select: { status: true } } } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  try {
    const agent = await approvedAgent(user.id);
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your delivery partner application still needs approval." }, { status: 403 });
    const policy = await loadEstimatePolicy();
    const [available, assigned, upcoming] = await Promise.all([
      !agent.isAvailable || !agent.serviceCity ? Promise.resolve([]) : prisma.delivery.findMany({
        where: { agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP", orderNumber: { not: { startsWith: "TEST-LIFE-" } }, kitchen: { city: { equals: agent.serviceCity, mode: "insensitive" } } } },
        orderBy: { createdAt: "asc" }, take: 100,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } } } } },
      }),
      prisma.delivery.findMany({
        where: { agentId: agent.id, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
        orderBy: { updatedAt: "desc" }, take: 20,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } } } } },
      }),
      !agent.isAvailable || !agent.serviceCity ? Promise.resolve([]) : prisma.order.findMany({ where: { status: { in: ["ORDER_PLACED","CONFIRMED","PREPARING"] }, orderNumber: { not: { startsWith: "TEST-LIFE-" } }, kitchen: { city: { equals: agent.serviceCity, mode: "insensitive" } }, scheduledFor: { gte: new Date(Date.now()-7200000), lte: new Date(Date.now()+7*86400000) } }, include: { kitchen: true, address: true, items: { select: { mealName:true,quantity:true } } }, orderBy: { orderedAt:"desc" },take:100 }),
    ]);
    const mapJob = (delivery: typeof available[number], isAssigned: boolean) => ({
      estimatedPay: estimateShares(Number(delivery.order.subtotal), Number(delivery.order.deliveryFee), orderDistance(delivery.order.kitchen, delivery.order.address), policy, delivery.estimatedPayout == null ? null : Number(delivery.estimatedPayout)).courier,
      routeDistanceKm: orderDistance(delivery.order.kitchen, delivery.order.address), alertAt: delivery.updatedAt.toISOString(), isUpcoming: false,
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
    return NextResponse.json({ userScope: user.id, policy, area: { online: agent.isAvailable, city: agent.serviceCity || "", radiusKm: agent.serviceRadiusMeters/1000 }, available: available.filter(d=>courierCovers(agent,d.order.kitchen)).slice(0,20).map((delivery) => mapJob(delivery, false)), assigned: assigned.map((delivery) => mapJob(delivery, true)), upcoming: upcoming.filter(o=>courierCovers(agent,o.kitchen)).slice(0,20).map(o=>({ deliveryId:"upcoming:"+o.id,orderId:o.id,orderNumber:o.orderNumber,deliveryStatus:"UPCOMING",orderStatus:o.status,trackingReference:null,pickup:o.kitchen.name+" · "+o.kitchen.locality,dropoff:o.address.locality+", "+o.address.city,items:o.items.map(i=>i.quantity+" × "+i.mealName),scheduledFor:o.scheduledFor.toISOString(),pickupPinned:o.kitchen.latitude!==null,dropoffPinned:o.address.latitude!==null,isSharingLocation:false,pickupNavigation:null,dropoffNavigation:null,estimatedPay:estimateShares(Number(o.subtotal),Number(o.deliveryFee),orderDistance(o.kitchen,o.address),policy).courier,routeDistanceKm:orderDistance(o.kitchen,o.address),alertAt:o.orderedAt.toISOString(),isUpcoming:true})) }, { headers: { "Cache-Control": "private, no-store" } });
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
    const candidate = await prisma.delivery.findUnique({ where: { id: parsed.data.deliveryId }, include: { order: { include: { kitchen:true,address:true } } } });
    if (!candidate || candidate.order.orderNumber.startsWith("TEST-LIFE-") || !courierCovers(agent,candidate.order.kitchen)) return NextResponse.json({error:"Go online in the kitchen’s service area before accepting this job."},{status:409});
    const policy=await loadEstimatePolicy(), km=orderDistance(candidate.order.kitchen,candidate.order.address), pay=estimateShares(Number(candidate.order.subtotal),Number(candidate.order.deliveryFee),km,policy).courier;
    const acceptedOrderId = await prisma.$transaction(async (tx) => {
      const claimed = await tx.delivery.updateMany({
        where: { id: parsed.data.deliveryId, agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP" } },
        data: { estimatedPayout:pay,estimatedDistanceKm:km,estimationRule:{...policy,method:"STRAIGHT_LINE_ESTIMATE"},agentId: agent.id, status: "ACCEPTED", acceptedAt: new Date(), assignedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("JOB_ALREADY_CLAIMED");
      const delivery = await tx.delivery.findUniqueOrThrow({ where: { id: parsed.data.deliveryId }, include: { order: true } });
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERY_ASSIGNED" } });
      await tx.orderEvent.create({ data: { orderId: delivery.orderId, actorUserId: user.id, status: "DELIVERY_ASSIGNED", detail: "A delivery partner accepted this job." } });
      await tx.notification.create({ data: { userId: delivery.order.customerId, title: "Courier assigned", body: "A Paustik delivery partner accepted order " + delivery.order.orderNumber + ".", kind: "DELIVERY", entityId: delivery.orderId } });
      await tx.notification.create({ data: { userId: user.id, title: "Delivery job accepted", body: "Your pickup is ready to view in Your deliveries.", kind: "DELIVERY", entityId: delivery.orderId } });
      return delivery.orderId;
    });
    scheduleEntityPush([acceptedOrderId]);
    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_ALREADY_CLAIMED") return NextResponse.json({ error: "Another courier accepted this delivery first." }, { status: 409 });
    console.error("Paustik delivery claim failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
