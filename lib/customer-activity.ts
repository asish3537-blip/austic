import "server-only";
import {prisma} from "@/lib/prisma";
export async function loadCustomerActivity(customerId: string, page: number) {
  return Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { orderedAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        orderedAt: true,
        scheduledFor: true,
        totalAmount: true,
        currency: true,
        kitchen: { select: { name: true } },
        items: { select: { mealName: true, quantity: true } },
        delivery: { select: { status: true } },
        ratings: { where: { authorId: customerId }, select: { mealScore: true, deliveryScore: true } },
      },
    }),
    prisma.subscription.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        nextRenewalAt: true,
        mealPlan: { select: { name: true, cadence: true, mealCount: true, price: true, currency: true } },
      },
    }),
    prisma.order.count({ where: { customerId } }),
  ]);
}

