import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  try {
    const profile = await prisma.motherProfile.findUnique({ where: { userId: user.id }, include: { kitchen: true } });
    if (!profile?.kitchen) return NextResponse.json({ error: "Kitchen profile not found." }, { status: 404 });
    if (profile.verificationStatus !== "APPROVED" || profile.kitchen.verificationStatus !== "APPROVED" || !profile.kitchen.isAcceptingOrders) {
      return NextResponse.json({ error: "Pausstik must approve your kitchen before you can publish meals." }, { status: 409 });
    }
    if (profile.kitchen.latitude === null || profile.kitchen.longitude === null) {
      return NextResponse.json({ error: "Set your kitchen pickup pin before publishing so couriers can use pickup geofencing." }, { status: 409 });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const futureCycles = await prisma.menuCycle.findMany({ where: { kitchenId: profile.kitchen.id, status: "DRAFT", endsOn: { gte: today } }, select: { id: true } });
    if (!futureCycles.length) return NextResponse.json({ error: "Add at least one future meal before publishing your weekly menu." }, { status: 409 });
    const cycleIds = futureCycles.map((cycle) => cycle.id);
    await prisma.$transaction([
      prisma.menuCycle.updateMany({ where: { id: { in: cycleIds } }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
      prisma.menu.updateMany({ where: { cycleId: { in: cycleIds }, serviceDate: { gte: today }, stockCount: { gt: 0 } }, data: { isAvailable: true } }),
      prisma.meal.updateMany({ where: { menus: { some: { cycleId: { in: cycleIds }, serviceDate: { gte: today }, stockCount: { gt: 0 } } } }, data: { isAvailable: true } }),
    ]);
    return NextResponse.json({ published: true, count: futureCycles.length });
  } catch (error) {
    console.error("Pausstik menu publish failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
