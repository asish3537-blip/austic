import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const favoriteSchema = z.object({ kitchenId: z.string().uuid(), favorite: z.boolean() });

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose a kitchen to save." }, { status: 400 }); }
  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid kitchen." }, { status: 400 });
  try {
    const kitchen = await prisma.kitchen.findFirst({ where: { id: parsed.data.kitchenId, verificationStatus: "APPROVED", isAcceptingOrders: true } });
    if (!kitchen) return NextResponse.json({ error: "This kitchen is not accepting orders now." }, { status: 409 });
    if (parsed.data.favorite) {
      await prisma.favoriteKitchen.upsert({
        where: { customerId_kitchenId: { customerId: user.id, kitchenId: kitchen.id } },
        create: { customerId: user.id, kitchenId: kitchen.id },
        update: {},
      });
    } else {
      await prisma.favoriteKitchen.deleteMany({ where: { customerId: user.id, kitchenId: kitchen.id } });
    }
    return NextResponse.json({ saved: parsed.data.favorite, message: parsed.data.favorite ? "Mother saved to your favourites." : "Mother removed from your favourites." });
  } catch (error) {
    console.error("Pausstik favorite kitchen update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
