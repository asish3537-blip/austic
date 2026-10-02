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
    const [available, assigned] = await Promise.all([
      prisma.delivery.findMany({
        where: { agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP" } },
        orderBy: { createdAt: "asc" }, take: 20,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } } } } },
      }),
      prisma.delivery.findMany({
        where: { agentId: agent.id, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
        orderBy: { updatedAt: "desc" }, take: 20,
        include: { order: { include: { kitchen: true, address: true, items: { select: { mealName: true, quantity: true } } } } },
      }),
    ]);
    const mapJob = (delivery: typeof available[number], isAssigned: boolean) => ({
      deliveryId: delivery.id, orderId: delivery.order.id, orderNumber: delivery.order.orderNumber,
      deliveryStatus: delivery.status, orderStatus: delivery.order.status, trackingReference: delivery.trackingReference,
      pickup: delivery.order.kitchen.name + " · " + delivery.order.kitchen.locality,
      dropoff: isAssigned ? delivery.order.address.addressLine1 + ", " + delivery.order.address.locality + ", " + delivery.order.address.city : delivery.order.address.locality + ", " + delivery.order.address.city,
      items: delivery.order.items.map((item) => item.quantity + " × " + item.mealName),
      scheduledFor: delivery.order.scheduledFor.toISOString(),
      pickupPinned: delivery.order.kitchen.latitude !== null && delivery.order.kitchen.longitude !== null,
      dropoffPinned: delivery.order.address.latitude !== null && delivery.order.address.longitude !== null,
      isSharingLocation: Boolean(delivery.locationConsentAt),
    });
    return NextResponse.json({ available: available.map((delivery) => mapJob(delivery, false)), assigned: assigned.map((delivery) => mapJob(delivery, true)) });
  } catch (error) {
    console.error("Pausstik delivery jobs could not load.", error instanceof Error ? error.name : "unknown error");
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
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.delivery.updateMany({
        where: { id: parsed.data.deliveryId, agentId: null, status: "ASSIGNED", order: { status: "READY_FOR_PICKUP" } },
        data: { agentId: agent.id, status: "ACCEPTED", acceptedAt: new Date(), assignedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("JOB_ALREADY_CLAIMED");
      const delivery = await tx.delivery.findUniqueOrThrow({ where: { id: parsed.data.deliveryId }, include: { order: true } });
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERY_ASSIGNED" } });
      await tx.orderEvent.create({ data: { orderId: delivery.orderId, actorUserId: user.id, status: "DELIVERY_ASSIGNED", detail: "A delivery partner accepted this job." } });
      await tx.notification.create({ data: { userId: delivery.order.customerId, title: "Courier assigned", body: "A Pausstik delivery partner accepted order " + delivery.order.orderNumber + ".", kind: "DELIVERY", entityId: delivery.orderId } });
    });
    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_ALREADY_CLAIMED") return NextResponse.json({ error: "Another courier accepted this delivery first." }, { status: 409 });
    console.error("Pausstik delivery claim failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
