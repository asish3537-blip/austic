import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { indiaDate, slotAllowed } from "@/lib/service-windows";
import { mealDeliveryInstant } from "@/lib/marketplace-rules";
import { readKitchenBranding } from "@/lib/kitchen-branding";

export async function GET() {
  try {
    const now = new Date();
    const kitchens = await prisma.kitchen.findMany({ where: { verificationStatus: "APPROVED", isAcceptingOrders: true, mother: { user: { status: "ACTIVE" } } }, select: { id: true, name: true, cuisine: true, city: true, locality: true, operatingHours: true, mother: { select: { user: { select: { name: true } } } }, menus: { where: { isAvailable: true, stockCount: { gt: 0 }, cycle: { status: "PUBLISHED" }, meal: { isAvailable: true }, serviceDate: { gte: new Date(indiaDate(now) + "T00:00:00Z"), lte: new Date(Date.now() + 7 * 86400000) } }, select: { id: true, serviceDate: true, deliveryTime: true, mealPeriod: true, meal: { select: { name: true, price: true, imageUrl: true } } }, take: 10 }, orders: { where: { status: "DELIVERED", orderNumber: { not: { startsWith: "TEST-LIFE-" } }, customer: { email: { not: { endsWith: "@paustik.invalid" } } } }, select: { ratings: { where: { mealScore: { not: null } }, select: { mealScore: true } } }, take: 100 } }, take: 30 });
    const featured = kitchens.map(kitchen => {
      const ratings = kitchen.orders.flatMap(order => order.ratings.map(rating => rating.mealScore!));
      return { id: kitchen.id, name: kitchen.name, mother: kitchen.mother.user.name, city: kitchen.city, locality: kitchen.locality, cuisine: kitchen.cuisine, image: readKitchenBranding(kitchen.operatingHours)?.image, rating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null, ratingCount: ratings.length, dishes: kitchen.menus.filter(menu => slotAllowed(menu.mealPeriod, menu.deliveryTime) && mealDeliveryInstant(menu.serviceDate, menu.deliveryTime).getTime() > Date.now() + 30 * 60000).map(menu => ({ name: menu.meal.name, price: Number(menu.meal.price) })).slice(0, 2) };
    }).filter(kitchen => kitchen.dishes.length).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6);
    return NextResponse.json({ kitchens: featured }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch { return NextResponse.json({ kitchens: [] }, { headers: { "Cache-Control": "no-store" } }); }
}
