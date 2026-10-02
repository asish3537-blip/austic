import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "Choose an order to track." }, { status: 400 });
  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: user.id },
      select: { status: true, orderNumber: true, delivery: { select: { status: true, currentLatitude: true, currentLongitude: true, currentAccuracyMeters: true, locationUpdatedAt: true } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const pointIsCurrent = order.delivery?.locationUpdatedAt && Date.now() - order.delivery.locationUpdatedAt.getTime() <= 120_000;
    const live = Boolean(pointIsCurrent && order.delivery?.currentLatitude !== null && order.delivery?.currentLongitude !== null && ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.delivery?.status ?? ""));
    return NextResponse.json({
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      deliveryStatus: order.delivery?.status ?? null,
      location: live ? {
        latitude: Number(order.delivery!.currentLatitude), longitude: Number(order.delivery!.currentLongitude),
        accuracyMeters: Number(order.delivery!.currentAccuracyMeters ?? 0), updatedAt: order.delivery!.locationUpdatedAt!.toISOString(),
      } : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Pausstik customer tracking read failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
