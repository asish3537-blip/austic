import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { MEAL_PRICE_TIERS } from "@/lib/marketplace-rules";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(3).max(90),
  description: z.string().trim().max(400).optional().default(""),
  tier: z.enum(["BASE", "EGG", "CHEESE", "CHICKEN"]),
  components: z.array(z.string().trim().min(1).max(70)).length(3),
  price: z.number().finite().min(69).max(500),
  deliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  servings: z.number().int().min(0).max(200),
  isAvailable: z.boolean(),
}).superRefine((meal, context) => {
  const rule = MEAL_PRICE_TIERS[meal.tier];
  if (meal.price < rule.startingPrice || meal.price > rule.maxPrice) context.addIssue({ code: "custom", message: rule.label + " must be priced between ₹" + rule.startingPrice + " and ₹" + rule.maxPrice + "." });
});

export async function PATCH(request: Request, context: { params: Promise<{ menuId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the updated meal details." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the meal details." }, { status: 400 });
  const { menuId } = await context.params;
  try {
    const mother = await prisma.motherProfile.findUnique({ where: { userId: user.id }, select: { id: true, kitchen: { select: { id: true, verificationStatus: true, isAcceptingOrders: true } } } });
    if (!mother?.kitchen) return NextResponse.json({ error: "Kitchen profile not found." }, { status: 404 });
    const menu = await prisma.menu.findFirst({ where: { id: menuId, kitchenId: mother.kitchen.id }, include: { meal: true, cycle: true } });
    if (!menu) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    const canPublish = mother.kitchen.verificationStatus === "APPROVED" && mother.kitchen.isAcceptingOrders && menu.cycle.status === "PUBLISHED";
    await prisma.$transaction([
      prisma.meal.update({ where: { id: menu.mealId }, data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: parsed.data.tier === "EGG" || parsed.data.tier === "CHICKEN" ? "NON_VEGETARIAN" : "VEGETARIAN",
        tier: parsed.data.tier,
        components: parsed.data.components,
        price: parsed.data.price,
        isAvailable: parsed.data.isAvailable && canPublish,
      } }),
      prisma.menu.update({ where: { id: menu.id }, data: {
        stockCount: parsed.data.servings,
        deliveryTime: parsed.data.deliveryTime,
        isAvailable: parsed.data.isAvailable && canPublish && parsed.data.servings > 0,
      } }),
    ]);
    return NextResponse.json({ updated: true, published: canPublish });
  } catch (error) {
    console.error("Pausstik menu update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ menuId: string }> }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  const { menuId } = await context.params;
  try {
    const mother = await prisma.motherProfile.findUnique({ where: { userId: user.id }, select: { kitchen: { select: { id: true } } } });
    if (!mother?.kitchen) return NextResponse.json({ error: "Kitchen profile not found." }, { status: 404 });
    const menu = await prisma.menu.findFirst({ where: { id: menuId, kitchenId: mother.kitchen.id }, select: { id: true } });
    if (!menu) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    await prisma.menu.update({ where: { id: menu.id }, data: { isAvailable: false, stockCount: 0 } });
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Pausstik menu item removal failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
