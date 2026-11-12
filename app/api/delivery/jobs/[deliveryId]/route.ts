import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { canStartLocalDelivery, indiaMinutes } from "@/lib/service-windows";
import { distanceMeters, lockWallet } from "@/lib/marketplace-rules";
import { loadDispatchPolicy } from "@/lib/dispatch-policy";
import { lockCourier } from "@/lib/delivery-batches";
import { matchesHandoverCode } from "@/lib/delivery-handover";
import { scheduleEntityPush } from "@/lib/web-push";

export const runtime = "nodejs";
const schema = z.object({ status: z.enum(["GOING_TO_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]), method: z.enum(["OTP", "GPS"]).default("GPS"), otp: z.string().regex(/^\d{6}$/).optional() });
const nextStatus: Record<string, string> = { ACCEPTED: "GOING_TO_PICKUP", GOING_TO_PICKUP: "PICKED_UP", PICKED_UP: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };

export async function PATCH(request: Request, context: { params: Promise<{ deliveryId: string }> }) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "DELIVERY_AGENT" || user.status !== "ACTIVE") return NextResponse.json({ error: "Active courier access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a delivery step and enter a six-digit code if using OTP." }, { status: 400 });
  const { deliveryId } = await context.params;
  try {
    const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId: user.id } });
    if (!agent || agent.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Courier approval required." }, { status: 403 });
    const policy = await loadDispatchPolicy();
    const x = parsed.data;
    const owner = await prisma.delivery.findFirst({ where: { id: deliveryId, agentId: agent.id }, select: { order: { select: { customerId: true } } } });
    if (!owner) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    const result = await prisma.$transaction(async tx => {
      await lockWallet(tx, owner.order.customerId);
      await lockCourier(tx, agent.id);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"delivery:" + deliveryId},0))`;
      const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, agentId: agent.id }, include: { order: { include: { kitchen: true, address: true } } } });
      if (!delivery) return { error: "This delivery is not assigned to you.", code: 404 };
      if (delivery.status === x.status) return { updated: true, status: x.status, orderId: delivery.orderId };
      if (nextStatus[delivery.status] !== x.status || ["CANCELLED", "FAILED"].includes(delivery.order.status)) return { error: "Refresh and complete the current delivery step first.", code: 409 };
      const now = new Date();
      if (x.status !== "DELIVERED" && !canStartLocalDelivery(now)) return { error: "New pickups and departures close at 20:30 IST. Contact operations.", code: 409 };
      if (x.status === "OUT_FOR_DELIVERY" && delivery.batchId) {
        const pending = await tx.delivery.count({ where: { batchId: delivery.batchId, agentId: agent.id, status: { in: ["ACCEPTED", "GOING_TO_PICKUP"] } } });
        if (pending) return { error: "Collect every order in your batch before starting the delivery route.", code: 409 };
      }
      let detail = "Courier updated the delivery step.";
      const handover = x.status === "PICKED_UP" || x.status === "DELIVERED";
      if (handover && x.method === "OTP") {
        if (delivery.handoverLockedUntil && delivery.handoverLockedUntil > now) return { error: "Too many incorrect codes. Try again after 15 minutes or contact operations.", code: 429 };
        const codeId = x.status === "PICKED_UP" ? delivery.id + ":pickup" : delivery.id;
        if (!x.otp || !matchesHandoverCode(codeId, delivery.handoverNonce ?? "legacy", x.otp)) {
          const attempts = delivery.handoverLockedUntil ? 1 : delivery.handoverAttempts + 1;
          await tx.delivery.update({ where: { id: delivery.id }, data: { handoverAttempts: attempts, handoverLockedUntil: attempts >= 5 ? new Date(now.getTime() + 15 * 60_000) : null } });
          return { error: attempts >= 5 ? "Code entry is locked for 15 minutes. Contact operations if needed." : "That code does not match this order.", code: attempts >= 5 ? 429 : 400 };
        }
        detail = x.status === "PICKED_UP" ? "Kitchen pickup confirmed with its one-time code." : "Customer handover verified with its one-time code.";
      }
      if (handover && x.method === "GPS") {
        if (x.status === "DELIVERED" && !policy.allowGpsHandover) return { error: "Ask the customer for the delivery code. GPS completion is disabled.", code: 409 };
        const target = x.status === "PICKED_UP" ? delivery.order.kitchen : delivery.order.address;
        if (target.latitude === null || target.longitude === null || !delivery.locationConsentAt || delivery.currentLatitude === null || delivery.currentLongitude === null || delivery.currentAccuracyMeters === null || !delivery.locationUpdatedAt || now.getTime() - delivery.locationUpdatedAt.getTime() > 120_000) return { error: "Send a fresh GPS fix or choose handover by code.", code: 409 };
        const distance = distanceMeters({ latitude: Number(delivery.currentLatitude), longitude: Number(delivery.currentLongitude) }, { latitude: Number(target.latitude), longitude: Number(target.longitude) });
        const radius = x.status === "PICKED_UP" ? 150 : policy.handoverRadiusMeters;
        if (distance + Number(delivery.currentAccuracyMeters) > radius) return { error: `Move within ${radius} m with an accurate GPS fix, or use the handover code.`, code: 409 };
        detail = `GPS handover verified within ${radius} m.`;
      }
      await tx.delivery.update({ where: { id: delivery.id }, data: { status: x.status,
        ...(handover ? { handoverAttempts: 0, handoverLockedUntil: null } : {}),
        ...(x.status === "PICKED_UP" ? { pickupAt: now } : {}),
        ...(x.status === "DELIVERED" ? { deliveredAt: now, handoverMethod: x.method, handoverNonce: null, currentLatitude: null, currentLongitude: null, currentAccuracyMeters: null, locationUpdatedAt: null, locationConsentAt: null } : {}),
      } });
      if (x.status !== "GOING_TO_PICKUP") {
        await tx.order.update({ where: { id: delivery.orderId }, data: { status: x.status } });
        await tx.orderEvent.create({ data: { orderId: delivery.orderId, actorUserId: user.id, status: x.status, detail: detail + (x.status === "DELIVERED" && indiaMinutes(now) >= 1260 ? " Late handover after 21:00 IST." : "") } });
        await tx.notification.create({ data: { userId: delivery.order.customerId, title: x.status === "DELIVERED" ? "Your order has arrived" : "Delivery update", body: delivery.order.orderNumber + " · " + x.status.toLowerCase().replaceAll("_", " "), kind: "DELIVERY", entityId: delivery.orderId } });
        if (x.status === "DELIVERED") await tx.deliveryAgentProfile.update({ where: { id: agent.id }, data: { completedDeliveries: { increment: 1 } } });
        if (x.status === "DELIVERED") await tx.bulkDeliveryRequest.updateMany({ where: { orderId: delivery.orderId, status: "DISPATCHED" }, data: { status: "DELIVERED", version: { increment: 1 } } });
      }
      return { updated: true, status: x.status, orderId: delivery.orderId };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.code });
    scheduleEntityPush([result.orderId]);
    return NextResponse.json({ updated: result.updated, status: result.status });
  } catch {
    return serviceUnavailable();
  }
}
