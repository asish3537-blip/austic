import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin } from "@/lib/http";

const online = z.object({ isAvailable: z.literal(true), mealCapacity: z.number().int().min(1).max(30).default(6), city: z.string().trim().min(2).max(100), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), zoneId: z.string().uuid().optional(), radiusKm: z.number().min(5).max(10), consent: z.literal(true) }).refine(value => Boolean(value.zoneId) || (value.latitude !== undefined && value.longitude !== undefined));
const schema = z.union([z.object({ isAvailable: z.literal(false) }), online]);
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "Courier access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose your neighbourhood zone or GPS location, carrying capacity and a 5–10 km service area." }, { status: 400 });
  const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id } });
  if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Your courier profile needs approval first." }, { status: 403 });
  const x = parsed.data;
  if (!x.isAvailable) {
    await prisma.deliveryAgentProfile.update({ where: { id: agent.id }, data: { isAvailable: false } });
    return NextResponse.json({ saved: true, message: "You are offline for new offers. Finish your assigned deliveries." });
  }
  const zone = x.zoneId ? await prisma.kitchen.findFirst({ where: { id: x.zoneId, verificationStatus: "APPROVED", isAcceptingOrders: true, latitude: { not: null }, longitude: { not: null }, mother: { user: { status: "ACTIVE" } } } }) : null;
  if (x.zoneId && !zone) return NextResponse.json({ error: "That service zone is unavailable. Refresh and choose another." }, { status: 409 });
  await prisma.deliveryAgentProfile.update({ where: { id: agent.id }, data: { isAvailable: true, mealCapacity: x.mealCapacity, serviceCity: zone?.city ?? x.city, serviceLatitude: zone?.latitude ?? x.latitude!, serviceLongitude: zone?.longitude ?? x.longitude!, serviceRadiusMeters: Math.round(x.radiusKm * 1000) } });
  return NextResponse.json({ saved: true, message: "You are online for nearby offers. The service-area pin is separate from delivery GPS sharing." });
}
