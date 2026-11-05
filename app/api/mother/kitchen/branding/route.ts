import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { normalizeKitchenImage, readKitchenBranding } from "@/lib/kitchen-branding";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ kind: z.enum(["photo", "logo"]), image: z.string().max(280000).nullable() });
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Mother access required." }, { status: 403 });
  const kitchen = await prisma.kitchen.findFirst({ where: { mother: { userId: user.id } }, select: { operatingHours: true } });
  return NextResponse.json({ branding: readKitchenBranding(kitchen?.operatingHours) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Mother access required." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 300000) return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a photo or kitchen logo." }, { status: 400 });
  let image: string | null = null;
  try { image = parsed.data.image === null ? null : normalizeKitchenImage(parsed.data.image); }
  catch { return NextResponse.json({ error: "This image could not be read. Choose another photo or logo using the picker." }, { status: 400 }); }
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"kitchen-branding:" + user.id},0))`;
      const kitchen = await tx.kitchen.findFirst({ where: { mother: { userId: user.id } }, select: { id: true, operatingHours: true } });
      if (!kitchen) throw new Error("KITCHEN_MISSING");
      const hours = kitchen.operatingHours && typeof kitchen.operatingHours === "object" && !Array.isArray(kitchen.operatingHours) ? kitchen.operatingHours : {};
      await tx.kitchen.update({ where: { id: kitchen.id }, data: { operatingHours: { ...hours, branding: image ? { image, kind: parsed.data.kind } : null } } });
    });
    return NextResponse.json({ branding: image ? { image, kind: parsed.data.kind } : null, message: image ? "Kitchen image saved. Customers can see it on your listing." : "Kitchen image removed." });
  } catch { return serviceUnavailable(); }
}
