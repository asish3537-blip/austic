import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const updateSchema = z.object({ status: z.enum(["GOING_TO_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]) });
const nextDeliveryStatus: Record<string, string> = {
  ACCEPTED: "GOING_TO_PICKUP",
  GOING_TO_PICKUP: "PICKED_UP",
  PICKED_UP: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};
const orderStatus: Record<string, "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED"> = {
  PICKED_UP: "PICKED_UP",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

function metersBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earth = 6371000;
  const rad = (value: number) => value * Math.PI / 180;
  const deltaLat = rad(lat2 - lat1);
  const deltaLon = rad(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function PATCH(request: Request, context: { params: Promise<{ deliveryId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose the next delivery step." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid delivery step." }, { status: 400 });
  const { deliveryId } = await context.params;
  try {
    const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id }, select: { id: true, verificationStatus: true } });
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your delivery partner application still needs approval." }, { status: 403 });
    const current = await prisma.delivery.findFirst({ where: { id: deliveryId, agentId: agent.id }, include: { order: { include: { kitchen: { select: { latitude: true, longitude: true } }, address: { select: { latitude: true, longitude: true } } } } } });
    if (!current) return NextResponse.json({ error: "This delivery is not assigned to your account." }, { status: 404 });
    if (nextDeliveryStatus[current.status] !== parsed.data.status) return NextResponse.json({ error: "Complete the current step before moving to the next one." }, { status: 409 });
    const timestamp = new Date();
    let geofenceDetail = "Delivery partner updated the delivery status.";
    if (parsed.data.status === "PICKED_UP" || parsed.data.status === "DELIVERED") {
      const isPickup = parsed.data.status === "PICKED_UP";
      const targetLatitude = isPickup ? current.order.kitchen.latitude : current.order.address.latitude;
      const targetLongitude = isPickup ? current.order.kitchen.longitude : current.order.address.longitude;
      if (targetLatitude === null || targetLongitude === null) {
        return NextResponse.json({ error: isPickup ? "The kitchen pickup pin is missing. Ask Pausstik operations to update it before pickup." : "The customer delivery pin is missing. Ask the customer to set a drop-off pin before handover." }, { status: 409 });
      }
      if (!current.locationConsentAt || current.currentLatitude === null || current.currentLongitude === null || current.currentAccuracyMeters === null || !current.locationUpdatedAt || timestamp.getTime() - current.locationUpdatedAt.getTime() > 120_000) {
        return NextResponse.json({ error: "Start location sharing and send a current GPS fix before confirming this geofence step." }, { status: 409 });
      }
      const distance = metersBetween(Number(current.currentLatitude), Number(current.currentLongitude), Number(targetLatitude), Number(targetLongitude));
      const uncertainty = Number(current.currentAccuracyMeters);
      const radiusMeters = 150;
      if (distance + uncertainty > radiusMeters) {
        return NextResponse.json({ error: "You are outside the 150 m geofence. Current distance is about " + Math.round(distance) + " m; move closer and send a fresh GPS fix." }, { status: 409 });
      }
      geofenceDetail = (isPickup ? "Pickup" : "Delivery") + " geofence confirmed within " + radiusMeters + " m.";
    }
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({ where: { id: current.id }, data: {
        status: parsed.data.status,
        ...(parsed.data.status === "PICKED_UP" ? { pickupAt: timestamp } : {}),
        ...(parsed.data.status === "DELIVERED" ? { deliveredAt: timestamp } : {}),
        ...(parsed.data.status === "DELIVERED" ? { currentLatitude: null, currentLongitude: null, currentAccuracyMeters: null, locationUpdatedAt: null, locationConsentAt: null } : {}),
      } });
      const nextOrderStatus = orderStatus[parsed.data.status];
      if (nextOrderStatus) {
        await tx.order.update({ where: { id: current.orderId }, data: { status: nextOrderStatus } });
        await tx.orderEvent.create({ data: { orderId: current.orderId, actorUserId: user.id, status: nextOrderStatus, detail: geofenceDetail } });
        await tx.notification.create({ data: { userId: current.order.customerId, title: "Delivery " + parsed.data.status.toLowerCase().replaceAll("_", " "), body: "Your courier updated order " + current.order.orderNumber + ".", kind: "DELIVERY", entityId: current.orderId } });
      }
    });
    return NextResponse.json({ updated: true, status: parsed.data.status });
  } catch (error) {
    console.error("Pausstik delivery progress update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
