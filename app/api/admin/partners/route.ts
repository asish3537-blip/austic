import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const reviewSchema = z.object({ userId: z.string().uuid(), decision: z.enum(["APPROVE", "REJECT"]) });

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try {
    const partners = await prisma.user.findMany({
      where: { role: { in: ["MOTHER", "DELIVERY_AGENT"] }, status: "PENDING" },
      orderBy: { createdAt: "asc" }, take: 100,
      include: { motherProfile: { include: { kitchen: true } }, deliveryAgentProfile: true, addresses: { where: { isDefault: true }, take: 1 } },
    });
    return NextResponse.json({ partners: partners.map((partner) => ({
      userId: partner.id, name: partner.name, role: partner.role, createdAt: partner.createdAt.toISOString(),
      cuisine: partner.motherProfile?.cuisine ?? null,
      kitchen: partner.motherProfile?.kitchen ? {
        name: partner.motherProfile.kitchen.name,
        location: partner.motherProfile.kitchen.locality + ", " + partner.motherProfile.kitchen.city,
        capacityPerDay: partner.motherProfile.kitchen.capacityPerDay,
      } : null,
      vehicleType: partner.deliveryAgentProfile?.vehicleType ?? null,
      location: partner.addresses[0] ? partner.addresses[0].locality + ", " + partner.addresses[0].city : null,
    })) });
  } catch (error) {
    console.error("Pausstik partner applications could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose an application and decision." }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid partner application." }, { status: 400 });
  const approved = parsed.data.decision === "APPROVE";
  try {
    const partner = await prisma.user.findUnique({ where: { id: parsed.data.userId }, include: { motherProfile: true, deliveryAgentProfile: true } });
    if (!partner || !["MOTHER", "DELIVERY_AGENT"].includes(partner.role) || partner.status !== "PENDING") {
      return NextResponse.json({ error: "This application is no longer pending." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: partner.id }, data: { status: approved ? "ACTIVE" : "REJECTED" } });
      if (partner.role === "MOTHER" && partner.motherProfile) {
        await tx.motherProfile.update({ where: { id: partner.motherProfile.id }, data: { verificationStatus: approved ? "APPROVED" : "REJECTED", ...(approved ? { approvedAt: new Date() } : {}) } });
        await tx.kitchen.updateMany({ where: { motherId: partner.motherProfile.id }, data: { verificationStatus: approved ? "APPROVED" : "REJECTED", isAcceptingOrders: approved } });
      }
      if (partner.role === "DELIVERY_AGENT" && partner.deliveryAgentProfile) {
        await tx.deliveryAgentProfile.update({ where: { id: partner.deliveryAgentProfile.id }, data: { verificationStatus: approved ? "APPROVED" : "REJECTED", ...(approved ? { approvedAt: new Date() } : {}) } });
      }
      await tx.adminActivityLog.create({
        data: { adminId: admin.id, action: approved ? "PARTNER_APPROVED" : "PARTNER_REJECTED", entityType: "USER", entityId: partner.id, newValue: { role: partner.role, status: approved ? "ACTIVE" : "REJECTED" } },
      });
      await tx.notification.create({
        data: { userId: partner.id, title: approved ? "Pausstik partner access approved" : "Pausstik partner application update", body: approved ? "Your account is approved. Sign in to continue." : "Your partner application was not approved. Contact Pausstik support for details.", kind: "ACCOUNT", entityId: partner.id },
      });
    });
    return NextResponse.json({ reviewed: true, status: approved ? "ACTIVE" : "REJECTED" });
  } catch (error) {
    console.error("Pausstik partner review failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
