import "server-only";
import {prisma} from "@/lib/prisma";
const orderSelect = (customerId:string)=>({
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        payments: { where: { status: "PENDING" }, select: { amount: true } },
        orderedAt: true,
        scheduledFor: true,
        totalAmount: true, subtotal: true, deliveryFee: true, discountAmount: true, taxAmount: true,
        currency: true,
        kitchen: { select: { name: true } },
        items: { select: { mealName: true, quantity: true } },
        delivery: { select: { status: true } },
        ratings: { where: { authorId: customerId }, select: { mealScore: true, deliveryScore: true } },
      } as const);
const terminal = ["DELIVERED", "CANCELLED", "FAILED"] as const;
export async function loadCustomerActivity(customerId: string, page: number, productsOnly=false) {
  return Promise.all([
    prisma.order.findMany({
      where: { customerId,status:{in:[...terminal]},...(productsOnly?{productRequest:{isNot:null}}:{productRequest:{is:null}}) },
      orderBy: { orderedAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
      select: orderSelect(customerId),
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
    prisma.order.count({ where: { customerId,status:{in:[...terminal]},...(productsOnly?{productRequest:{isNot:null}}:{productRequest:{is:null}}) } }),
    prisma.order.findMany({where:{customerId,status:{notIn:[...terminal]},...(productsOnly?{productRequest:{isNot:null}}:{productRequest:{is:null}})},orderBy:{scheduledFor:"asc"},select:orderSelect(customerId)}),
  ]);
}

