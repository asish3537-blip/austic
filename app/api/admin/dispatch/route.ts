import { lockWallet } from "@/lib/marketplace-rules";
import { expireOverdueOrders } from "@/lib/overdue-orders";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { loadDispatchPolicy } from "@/lib/dispatch-policy";
import { loadEstimatePolicy, orderDistance } from "@/lib/partner-income";
import { estimateShares } from "@/lib/earnings-estimates";
import { lockCourier } from "@/lib/delivery-batches";
import { scheduleEntityPush } from "@/lib/web-push";

const policySchema = z.object({ action: z.literal("policy"), baseFee: z.number().min(9).max(500), includedKm: z.number().min(0).max(25), perKm: z.number().min(0).max(100), maximumFee: z.number().min(9).max(1000), handoverRadiusMeters: z.union([z.literal(50), z.literal(100)]), allowGpsHandover: z.boolean() }).refine(value => value.maximumFee >= value.baseFee);
const couponSchema = z.object({ action: z.literal("coupon"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/), kind: z.enum(["FIXED", "PERCENT", "DELIVERY"]), value: z.number().positive().max(10000), minimumSpend: z.number().min(0).max(100000), maximumDiscount: z.number().positive().max(10000), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), firstOrderOnly: z.boolean(), usageLimit: z.number().int().min(1).max(100000), perCustomerLimit: z.number().int().min(1).max(100) }).refine(value => new Date(value.endsAt) > new Date(value.startsAt) && (value.kind !== "PERCENT" || value.value <= 100));
const channelUrl = (host: string) => z.string().max(300).refine(value => !value || (URL.canParse(value) && new URL(value).protocol === "https:" && [host, "www." + host].includes(new URL(value).hostname) && new URL(value).pathname.length > 1));
const schema = z.union([policySchema, couponSchema, z.object({ action: z.literal("social"), youtube: channelUrl("youtube.com"), facebook: channelUrl("facebook.com"), instagram: channelUrl("instagram.com") }), z.object({ action: z.literal("toggleCoupon"), id: z.string().uuid(), active: z.boolean() }), z.object({ action: z.literal("handoverOverride"), deliveryId: z.string().uuid(), reason: z.string().trim().min(15).max(500) })]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    await expireOverdueOrders();
    const [policy, earningPolicy, coupons, deliveries] = await Promise.all([
      loadDispatchPolicy(), loadEstimatePolicy(),
      prisma.coupon.findMany({ include: { _count: { select: { redemptions: true } } }, orderBy: { endsAt: "desc" }, take: 50 }),
      prisma.delivery.findMany({ orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, batchId: true, status: true, handoverMethod: true, estimatedPayout: true, agent: { select: { user: { select: { name: true } } } }, order: { select: { id: true, orderNumber: true, subtotal: true, deliveryFee: true, discountAmount: true, taxAmount: true, totalAmount: true, paymentStatus: true, kitchen: { select: { name: true, latitude: true, longitude: true } }, address: { select: { latitude: true, longitude: true } } } } } }),
    ]);
    const rows = deliveries.map(delivery => {
      const order = delivery.order;
      const excluded = ["CANCELLED", "FAILED"].includes(delivery.status);
      const netRevenue = excluded ? 0 : Number(order.totalAmount) - Number(order.taxAmount);
      const shares = excluded ? {mother:0,courier:0} : estimateShares(Number(order.subtotal), Number(order.deliveryFee), orderDistance(order.kitchen, order.address), earningPolicy, delivery.estimatedPayout == null ? null : Number(delivery.estimatedPayout));
      return { id: delivery.id, batchId: delivery.batchId, status: delivery.status, handoverMethod: delivery.handoverMethod, courier: delivery.agent?.user.name ?? "Unassigned", orderNumber: order.orderNumber, kitchen: order.kitchen.name, food: Number(order.subtotal), delivery: Number(order.deliveryFee), discount: Number(order.discountAmount), total: Number(order.totalAmount), paymentStatus: order.paymentStatus, mother: shares.mother, courierPay: shares.courier, netRevenue, contribution: Math.round((netRevenue - shares.mother - shares.courier) * 100) / 100 };
    });
    return NextResponse.json({ policy, coupons, rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return serviceUnavailable(); }
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the settings, code and validity dates. GPS radius must be 50 or 100 m." }, { status: 400 });
  const x = parsed.data;
  try {
    const orderIds = await prisma.$transaction(async tx => {
      if (x.action === "policy") {
        const { action, ...data } = x;
        void action;
        await tx.dispatchPolicy.upsert({ where: { id: "pilot" }, create: { id: "pilot", ...data }, update: data });
      } else if (x.action === "coupon") {
        const { action, ...data } = x;
        void action;
        await tx.coupon.create({ data: { ...data, startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt) } });
      } else if (x.action === "social") {
        const links = { youtube: x.youtube, facebook: x.facebook, instagram: x.instagram };
        await tx.dispatchPolicy.upsert({ where: { id: "pilot" }, create: { id: "pilot", socialLinks: links }, update: { socialLinks: links } });
      } else if (x.action === "toggleCoupon") {
        await tx.coupon.update({ where: { id: x.id }, data: { isActive: x.active } });
      } else {
        const candidate = await tx.delivery.findUnique({ where: { id: x.deliveryId }, include: { order: { select: { customerId: true } } } });
        if (!candidate?.agentId) throw new Error("NOT_OUT_FOR_DELIVERY");
        await lockWallet(tx, candidate.order.customerId);
        await lockCourier(tx, candidate.agentId);
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"delivery:" + x.deliveryId},0))`;
        const delivery = await tx.delivery.findUniqueOrThrow({ where: { id: x.deliveryId }, include: { order: true } });
        if (delivery.status !== "OUT_FOR_DELIVERY" || delivery.order.status !== "OUT_FOR_DELIVERY") throw new Error("NOT_OUT_FOR_DELIVERY");
        await tx.delivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date(), handoverMethod: "ADMIN_OVERRIDE", handoverNonce: null, currentLatitude: null, currentLongitude: null, currentAccuracyMeters: null, locationUpdatedAt: null, locationConsentAt: null } });
        await tx.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
        await tx.bulkDeliveryRequest.updateMany({ where: { orderId: delivery.orderId }, data: { status: "DELIVERED", version: { increment: 1 } } });
        await tx.deliveryAgentProfile.update({ where: { id: delivery.agentId! }, data: { completedDeliveries: { increment: 1 } } });
        await tx.orderEvent.create({ data: { orderId: delivery.orderId, actorUserId: user.id, status: "DELIVERED", detail: "Operations handover override: " + x.reason } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "DELIVERY_HANDOVER_OVERRIDE", entityType: "Delivery", entityId: delivery.id, newValue: { reason: x.reason } } });
        await tx.notification.create({ data: { userId: delivery.order.customerId, title: "Delivery confirmed by operations", body: delivery.order.orderNumber + " was completed by operations. Contact support if your meal has not arrived.", kind: "DELIVERY", entityId: delivery.orderId } });
        return [delivery.orderId];
      }
      await tx.adminActivityLog.create({ data: { adminId: user.id, action: "DISPATCH_" + x.action.toUpperCase(), entityType: "Dispatch", entityId: "00000000-0000-0000-0000-000000000001", newValue: x } });
      return [];
    });
    if (orderIds.length) scheduleEntityPush(orderIds);
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_OUT_FOR_DELIVERY") return NextResponse.json({ error: "Only an assigned order currently out for delivery can be completed by operations." }, { status: 409 });
    return NextResponse.json({ error: "Could not save. Check whether the coupon code already exists and refresh before retrying." }, { status: 409 });
  }
}
