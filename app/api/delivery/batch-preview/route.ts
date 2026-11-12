import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { loadDispatchPolicy } from "@/lib/dispatch-policy";
import { loadEstimatePolicy, orderDistance } from "@/lib/partner-income";
import { estimateShares } from "@/lib/earnings-estimates";
import { courierCovers } from "@/lib/courier-offers";
import { batchRoute } from "@/lib/dispatch-rules";
import { assertBatchCapacity, deliveryStop, DispatchError, lockCourier } from "@/lib/delivery-batches";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "Courier access required." }, { status: 403 });
  const parsed = z.object({ deliveryIds: z.array(z.string().uuid()).min(1).max(3) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose up to three deliveries." }, { status: 400 });
  try {
    const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id } });
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Courier approval required." }, { status: 403 });
    const [policy, estimates] = await Promise.all([loadDispatchPolicy(), loadEstimatePolicy()]);
    const result = await prisma.$transaction(async tx => {
      await lockCourier(tx, agent.id);
      const candidates = await tx.delivery.findMany({ where: { id: { in: parsed.data.deliveryIds } }, include: { order: { include: { kitchen: true, address: true, items: true, bulkDeliveryRequest: true } } } });
      if (candidates.length !== new Set(parsed.data.deliveryIds).size || candidates.some(delivery => delivery.agentId || delivery.status !== "ASSIGNED" || delivery.order.status !== "READY_FOR_PICKUP" || delivery.order.bulkDeliveryRequest || !courierCovers(agent, delivery.order.kitchen))) throw new DispatchError("One job is unavailable or needs an arranged bulk vehicle.");
      const active = await assertBatchCapacity(tx, agent.id, candidates, agent.mealCapacity, policy);
      const all = [...active, ...candidates];
      return { deliveryIds: parsed.data.deliveryIds, meals: all.reduce((sum, delivery) => sum + delivery.order.items.reduce((n, item) => n + item.quantity, 0), 0), estimate: candidates.reduce((sum, delivery) => sum + estimateShares(Number(delivery.order.subtotal), Number(delivery.order.deliveryFee), orderDistance(delivery.order.kitchen, delivery.order.address), estimates).courier, 0), route: batchRoute(all.map(delivery => deliveryStop(delivery.id, delivery.order))).map(stop => { const delivery = all.find(delivery => delivery.id === stop.id)!; return { kind: stop.kind, orderNumber: delivery.order.orderNumber, area: stop.kind === "PICKUP" ? delivery.order.kitchen.name + " · " + delivery.order.kitchen.locality : delivery.order.address.locality }; }) };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DispatchError) return NextResponse.json({ error: error.message }, { status: 409 });
    return serviceUnavailable();
  }
}
