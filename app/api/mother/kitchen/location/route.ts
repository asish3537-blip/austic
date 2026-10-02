import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const locationSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), consent: z.literal(true) });

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Allow location access to set your kitchen pin." }, { status: 400 }); }
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Location consent and a valid kitchen coordinate are required." }, { status: 400 });
  try {
    const profile = await prisma.motherProfile.findUnique({ where: { userId: user.id }, select: { kitchen: { select: { id: true } } } });
    if (!profile?.kitchen) return NextResponse.json({ error: "Kitchen profile not found." }, { status: 404 });
    await prisma.kitchen.update({ where: { id: profile.kitchen.id }, data: { latitude: parsed.data.latitude, longitude: parsed.data.longitude, serviceRadiusMeters: 150 } });
    return NextResponse.json({ saved: true, message: "Kitchen pickup pin saved. Publish your menu to accept orders." });
  } catch (error) {
    console.error("Pausstik kitchen location save failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
