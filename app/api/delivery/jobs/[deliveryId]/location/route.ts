import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const fixSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(50),
  sharingConsent: z.literal(true),
});

function metersBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earth = 6371000;
  const rad = (value: number) => value * Math.PI / 180;
  const deltaLat = rad(lat2 - lat1);
  const deltaLon = rad(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request, context: { params: Promise<{ deliveryId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Start location sharing from your delivery task." }, { status: 400 }); }
  const parsed = fixSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Location sharing needs your consent, a valid GPS position and accuracy within 50 metres." }, { status: 400 });
  const { deliveryId } = await context.params;
  try {
    const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id }, select: { id: true, verificationStatus: true } });
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your delivery partner application still needs approval." }, { status: 403 });
    const delivery = await prisma.delivery.findFirst({ where: { id: deliveryId, agentId: agent.id }, select: { id: true, status: true, currentLatitude: true, currentLongitude: true, locationUpdatedAt: true } });
    if (!delivery || ["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)) return NextResponse.json({ error: "This delivery is closed or not assigned to your account." }, { status: 404 });
    const now = new Date();
    if (delivery.locationUpdatedAt && now.getTime() - delivery.locationUpdatedAt.getTime() < 5000) return NextResponse.json({ error: "Location update received. Wait a few seconds before sending the next one." }, { status: 429 });
    if (delivery.currentLatitude !== null && delivery.currentLongitude !== null && delivery.locationUpdatedAt) {
      const elapsedSeconds = (now.getTime() - delivery.locationUpdatedAt.getTime()) / 1000;
      const distance = metersBetween(Number(delivery.currentLatitude), Number(delivery.currentLongitude), parsed.data.latitude, parsed.data.longitude);
      if (elapsedSeconds > 0 && distance / elapsedSeconds > 55) return NextResponse.json({ error: "That GPS update moved too far to verify. Try again after your location settles." }, { status: 400 });
    }
    await prisma.delivery.update({ where: { id: delivery.id }, data: {
      currentLatitude: parsed.data.latitude,
      currentLongitude: parsed.data.longitude,
      currentAccuracyMeters: parsed.data.accuracyMeters,
      locationUpdatedAt: now,
      locationConsentAt: delivery.locationUpdatedAt ? undefined : now,
    } });
    return NextResponse.json({ saved: true, updatedAt: now.toISOString() });
  } catch (error) {
    console.error("Pausstik courier location update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ deliveryId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active delivery account is required." }, { status: 403 });
  const { deliveryId } = await context.params;
  try {
    const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!agent) return NextResponse.json({ error: "Delivery partner profile not found." }, { status: 404 });
    const result = await prisma.delivery.updateMany({
      where: { id: deliveryId, agentId: agent.id, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
      data: { currentLatitude: null, currentLongitude: null, currentAccuracyMeters: null, locationUpdatedAt: null, locationConsentAt: null },
    });
    if (!result.count) return NextResponse.json({ error: "This delivery is closed or not assigned to your account." }, { status: 404 });
    return NextResponse.json({ stopped: true });
  } catch (error) {
    console.error("Pausstik courier location sharing stop failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
