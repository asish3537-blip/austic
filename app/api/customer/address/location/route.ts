import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const locationSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), consent: z.literal(true) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  try {
    const address = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { id: true, latitude: true, longitude: true, locality: true, city: true } });
    return NextResponse.json({ pinned: Boolean(address?.latitude !== null && address?.latitude !== undefined && address?.longitude !== null && address?.longitude !== undefined), address: address ? address.locality + ", " + address.city : null });
  } catch (error) {
    console.error("Pausstik customer delivery pin could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Allow location access to set your delivery pin." }, { status: 400 }); }
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Location consent and a valid delivery coordinate are required." }, { status: 400 });
  try {
    const address = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    if (!address) return NextResponse.json({ error: "Add a delivery address before setting a drop-off pin." }, { status: 409 });
    await prisma.address.update({ where: { id: address.id }, data: { latitude: parsed.data.latitude, longitude: parsed.data.longitude } });
    return NextResponse.json({ saved: true, message: "Delivery pin saved. It will be shared with the courier assigned to your order." });
  } catch (error) {
    console.error("Pausstik customer delivery pin save failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
