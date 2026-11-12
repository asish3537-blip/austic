import { expireOverdueOrders } from "@/lib/overdue-orders";
import { deliveryHandoverCode } from "@/lib/delivery-handover";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId || !z.string().uuid().safeParse(orderId).success) return NextResponse.json({ error: "Choose a valid order to track." }, { status: 400 });
  try {
    await expireOverdueOrders(user.id);
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: user.id },
      select: { status: true, orderNumber: true, scheduledFor: true, events: { orderBy: { createdAt: "asc" }, take: 50, select: { status: true, createdAt: true } }, address: { select: { latitude: true, longitude: true } }, delivery: { select: { id: true, handoverNonce: true, handoverMethod: true, status: true, currentLatitude: true, currentLongitude: true, currentAccuracyMeters: true, locationUpdatedAt: true, locationConsentAt: true, agent: { select: { user: { select: { name: true } } } } } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const age = order.delivery?.locationUpdatedAt ? Date.now() - order.delivery.locationUpdatedAt.getTime() : Infinity;
    const live = Boolean(age >= 0 && age <= 120_000 && order.delivery?.locationConsentAt && order.delivery?.currentLatitude !== null && order.delivery?.currentLongitude !== null && order.delivery?.currentAccuracyMeters !== null && Number(order.delivery?.currentAccuracyMeters) <= 50 && !["DELIVERED", "CANCELLED", "FAILED"].includes(order.status) && ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.delivery?.status ?? ""));
    return NextResponse.json({
      handoverCode: order.delivery && ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.delivery.status) && !["DELIVERED","CANCELLED","FAILED"].includes(order.status) ? deliveryHandoverCode(order.delivery.id, order.delivery.handoverNonce ?? "legacy") : null,
      handoverMethod: order.delivery?.handoverMethod,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      deliveryStatus: order.delivery?.status ?? null,
      scheduledFor: order.scheduledFor.toISOString(),
      courierName: order.delivery?.agent?.user.name ?? null,
      events: order.events.map(event => ({ status: event.status, at: event.createdAt.toISOString() })),
      dropoff: live && order.address.latitude !== null && order.address.longitude !== null ? { latitude: Number(order.address.latitude), longitude: Number(order.address.longitude) } : null,
      location: live ? {
        latitude: Number(order.delivery!.currentLatitude), longitude: Number(order.delivery!.currentLongitude),
        accuracyMeters: Number(order.delivery!.currentAccuracyMeters ?? 0), updatedAt: order.delivery!.locationUpdatedAt!.toISOString(),
      } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Paustik customer tracking read failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
