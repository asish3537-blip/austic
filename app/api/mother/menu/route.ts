import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const mealSchema = z.object({
  name: z.string().trim().min(3).max(90),
  description: z.string().trim().max(400).optional().default(""),
  category: z.enum(["VEGETARIAN", "NON_VEGETARIAN", "VEGAN"]),
  price: z.number().finite().min(20).max(5000),
  servings: z.number().int().min(1).max(200),
  serviceDate: z.iso.date(),
  ingredients: z.string().max(500).optional().default(""),
  allergens: z.string().max(300).optional().default(""),
});

function mondayFor(date: Date) {
  const monday = new Date(date);
  const day = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - day);
  return monday;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  }
  try {
    const mother = await prisma.motherProfile.findUnique({ where: { userId: user.id }, include: { kitchen: true } });
    if (!mother?.kitchen) return NextResponse.json({ error: "Finish your kitchen application before managing a menu." }, { status: 409 });
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 14);
    const [menus, orders, earnings] = await Promise.all([
      prisma.menu.findMany({
        where: { kitchenId: mother.kitchen.id, serviceDate: { gte: start, lt: end } },
        orderBy: [{ serviceDate: "asc" }, { meal: { name: "asc" } }],
        include: { meal: true, cycle: { select: { status: true } } },
      }),
      prisma.order.findMany({
        where: { motherId: mother.id, status: { notIn: ["DELIVERED", "CANCELLED", "FAILED"] } },
        orderBy: { orderedAt: "asc" },
        take: 30,
        include: { customer: { select: { name: true } }, items: { select: { mealName: true, quantity: true } }, delivery: { select: { status: true, trackingReference: true } } },
      }),
      prisma.earning.aggregate({ where: { motherId: mother.id, beneficiaryRole: "MOTHER" }, _sum: { netAmount: true } }),
    ]);
    return NextResponse.json({
      kitchen: { name: mother.kitchen.name, approved: mother.kitchen.verificationStatus === "APPROVED", acceptingOrders: mother.kitchen.isAcceptingOrders, hasLocation: mother.kitchen.latitude !== null && mother.kitchen.longitude !== null },
      menus: menus.map((menu) => ({
        id: menu.id, mealId: menu.mealId, name: menu.meal.name, description: menu.meal.description,
        category: menu.meal.category, price: Number(menu.meal.price), serviceDate: menu.serviceDate.toISOString().slice(0, 10),
        servings: menu.stockCount, isAvailable: menu.isAvailable, isPublished: menu.cycle.status === "PUBLISHED",
      })),
      orders: orders.map((order) => ({
        id: order.id, orderNumber: order.orderNumber, status: order.status, customer: order.customer.name,
        items: order.items.map((item) => item.quantity + " × " + item.mealName), total: Number(order.totalAmount),
        scheduledFor: order.scheduledFor.toISOString(), deliveryStatus: order.delivery?.status ?? null,
      })),
      earningsRecorded: Number(earnings._sum.netAmount ?? 0),
      currency: "INR",
    });
  } catch (error) {
    console.error("Pausstik mother workspace could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user || user.role !== "MOTHER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "An active mother account is required." }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the meal details." }, { status: 400 }); }
  const parsed = mealSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the meal details." }, { status: 400 });
  try {
    const mother = await prisma.motherProfile.findUnique({ where: { userId: user.id }, include: { kitchen: true } });
    if (!mother?.kitchen) return NextResponse.json({ error: "Finish your kitchen application first." }, { status: 409 });
    const serviceDate = new Date(parsed.data.serviceDate + "T00:00:00.000Z");
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (serviceDate < today) return NextResponse.json({ error: "Choose today or a future date for this menu item." }, { status: 400 });
    const weekStart = mondayFor(serviceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const publish = mother.kitchen.verificationStatus === "APPROVED" && mother.kitchen.isAcceptingOrders && mother.kitchen.latitude !== null && mother.kitchen.longitude !== null;
    const cycle = await prisma.menuCycle.upsert({
      where: { kitchenId_startsOn_endsOn: { kitchenId: mother.kitchen.id, startsOn: weekStart, endsOn: weekEnd } },
      create: {
        kitchenId: mother.kitchen.id,
        name: "Week of " + weekStart.toISOString().slice(0, 10),
        startsOn: weekStart,
        endsOn: weekEnd,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
      update: publish ? { status: "PUBLISHED", publishedAt: new Date() } : {},
    });
    const meal = await prisma.meal.create({
      data: {
        kitchenId: mother.kitchen.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: parsed.data.category,
        cuisine: mother.kitchen.cuisine,
        price: parsed.data.price,
        ingredients: parsed.data.ingredients.split(",").map((item) => item.trim()).filter(Boolean),
        allergens: parsed.data.allergens.split(",").map((item) => item.trim()).filter(Boolean),
        isAvailable: publish,
      },
    });
    const menu = await prisma.menu.create({
      data: {
        kitchenId: mother.kitchen.id,
        cycleId: cycle.id,
        mealId: meal.id,
        serviceDate,
        mealPeriod: "LUNCH",
        stockCount: parsed.data.servings,
        isAvailable: publish,
      },
    });
    return NextResponse.json({ created: true, menuId: menu.id, published: publish, message: publish ? "Meal added to your live menu." : "Meal saved as a draft. Kitchen approval and a pickup pin are needed before customers can order." }, { status: 201 });
  } catch (error) {
    console.error("Pausstik mother menu save failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
