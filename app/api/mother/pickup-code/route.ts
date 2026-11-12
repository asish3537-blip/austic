import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deliveryHandoverCode } from "@/lib/delivery-handover";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Mother account required." }, { status: 403 });
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!z.string().uuid().safeParse(orderId).success) return NextResponse.json({ error: "Choose an order." }, { status: 400 });
  const delivery = await prisma.delivery.findFirst({ where: { orderId: orderId!, agentId: { not: null }, status: { in: ["ACCEPTED", "GOING_TO_PICKUP"] }, order: { mother: { userId: user.id }, status: "DELIVERY_ASSIGNED" } }, select: { id: true, handoverNonce: true } });
  if (!delivery) return NextResponse.json({ error: "Pickup code is available after a courier accepts, until pickup." }, { status: 409 });
  return NextResponse.json({ code: deliveryHandoverCode(delivery.id + ":pickup", delivery.handoverNonce ?? "legacy") }, { headers: { "Cache-Control": "private, no-store" } });
}
