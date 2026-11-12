import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { normalizeKitchenImage } from "@/lib/kitchen-branding";

class QualityError extends Error {}
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload"), kind: z.enum(["PREPARATION", "FSSAI", "KITCHEN"]), caption: z.string().trim().min(5).max(300), image: z.string().max(2800000), licenseNumber: z.string().regex(/^\d{14}$/).optional(), validUntil: z.iso.date().optional() }),
  z.object({ action: z.literal("review"), id: z.string().uuid(), status: z.enum(["APPROVED", "NEEDS_ACTION", "REJECTED"]), notes: z.string().trim().min(5).max(1000) }),
  z.object({ action: z.literal("inspection"), kitchenId: z.string().uuid(), status: z.enum(["PASS", "NEEDS_ACTION", "FAIL"]), score: z.number().min(0).max(100), notes: z.string().trim().min(10).max(1500), correctiveAction: z.string().max(1000), inspectedAt: z.iso.datetime() }),
  z.object({ action: z.literal("training"), kitchenId: z.string().uuid(), topic: z.string().trim().min(4).max(120), notes: z.string().trim().min(5).max(1000), dueAt: z.iso.datetime() }),
  z.object({ action: z.literal("trainingStatus"), id: z.string().uuid(), status: z.enum(["SUBMITTED", "COMPLETED"]) }),
]);
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "MOTHER"].includes(user.role)) return NextResponse.json({ error: "Kitchen or admin access required." }, { status: 403 });
  try {
    const imageId = request.nextUrl.searchParams.get("imageId");
    if (imageId) {
      if (!z.string().uuid().safeParse(imageId).success) return new NextResponse(null, { status: 404 });
      const evidence = await prisma.kitchenEvidence.findUnique({ where: { id: imageId } });
      const owner = evidence && await prisma.kitchen.findFirst({ where: { id: evidence.kitchenId, mother: { userId: user.id } } });
      if (!evidence || (user.role !== "ADMIN" && !owner)) return new NextResponse(null, { status: 404 });
      return new NextResponse(Buffer.from(evidence.image.slice(22), "base64"), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const kitchens = await prisma.kitchen.findMany({ where: user.role === "MOTHER" ? { mother: { userId: user.id } } : {}, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, motherId: true, mother: { select: { userId: true, fssaiNumber: true, user: { select: { name: true } } } } } });
    const kitchenId = request.nextUrl.searchParams.get("kitchenId") || kitchens[0]?.id;
    const kitchen = kitchens.find(item => item.id === kitchenId);
    if (!kitchen) return NextResponse.json({ kitchens, kitchen: null, evidence: [], inspections: [], training: [], feedback: [] });
    const [evidence, inspections, training, feedback] = await Promise.all([
      prisma.kitchenEvidence.findMany({ where: { kitchenId }, select: { id: true, kind: true, caption: true, licenseNumber: true, validUntil: true, reviewStatus: true, reviewNotes: true, createdAt: true, reviewedAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.qualityCheck.findMany({ where: { kitchenId }, orderBy: { inspectedAt: "desc" }, take: 20 }),
      prisma.kitchenTraining.findMany({ where: { kitchenId }, orderBy: { dueAt: "asc" }, take: 30 }),
      prisma.rating.findMany({ where: { order: { kitchenId } }, select: { id: true, mealScore: true, deliveryScore: true, comment: true, createdAt: true, order: { select: { orderNumber: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    ]);
    return NextResponse.json({ kitchens, kitchen, evidence, inspections, training, feedback }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return serviceUnavailable(); }
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || !["ADMIN", "MOTHER"].includes(user.role)) return NextResponse.json({ error: "Kitchen or admin access required." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2900000) return NextResponse.json({ error: "Use an image under 2 MB after resizing." }, { status: 413 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the photo, FSSAI number and required details." }, { status: 400 });
  const x = parsed.data;
  if (user.role !== "ADMIN" && !["upload", "trainingStatus"].includes(x.action)) return NextResponse.json({ error: "Operations review requires admin access." }, { status: 403 });
  try {
    await prisma.$transaction(async tx => {
      if (x.action === "upload") {
        if (user.role !== "MOTHER") throw new QualityError("Use the mother account to upload kitchen evidence.");
        const kitchen = await tx.kitchen.findFirstOrThrow({ where: { mother: { userId: user.id } } });
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"evidence:" + kitchen.id},0))`;
        if (await tx.kitchenEvidence.count({ where: { kitchenId: kitchen.id } }) >= 50) throw new QualityError("Your evidence library has reached 50 photos. Contact operations for review.");
        if (x.kind === "FSSAI" && (!x.licenseNumber || !x.validUntil)) throw new QualityError("Add the 14-digit FSSAI number and expiry date with its document photo.");
        const image = normalizeKitchenImage(x.image, { maxLength: 2800000, maxDimension: 1280, maxChunk: 2100000 });
        const evidence = await tx.kitchenEvidence.create({ data: { kitchenId: kitchen.id, uploadedBy: user.id, kind: x.kind, caption: x.caption, image, licenseNumber: x.kind === "FSSAI" ? x.licenseNumber : undefined, validUntil: x.kind === "FSSAI" ? new Date(x.validUntil!) : undefined } });
        const admins = await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true }, take: 20 });
        await tx.notification.createMany({ data: admins.map(admin => ({ userId: admin.id, title: "Kitchen evidence awaiting review", body: kitchen.name + " · " + x.kind, kind: "QUALITY", entityId: evidence.id })) });
      } else if (x.action === "review") {
        const evidence = await tx.kitchenEvidence.findUniqueOrThrow({ where: { id: x.id } });
        await tx.kitchenEvidence.update({ where: { id: x.id }, data: { reviewStatus: x.status, reviewNotes: x.notes, reviewedBy: user.id, reviewedAt: new Date() } });
        const kitchen = await tx.kitchen.findUniqueOrThrow({ where: { id: evidence.kitchenId }, include: { mother: true } });
        if (x.status === "APPROVED" && evidence.kind === "FSSAI") {
          if (!evidence.validUntil || evidence.validUntil < new Date()) throw new QualityError("This document has expired. Ask for a current FSSAI document.");
          await tx.motherProfile.update({ where: { id: kitchen.motherId }, data: { fssaiNumber: evidence.licenseNumber } });
        }
        await tx.notification.create({ data: { userId: kitchen.mother.userId, title: "Kitchen evidence reviewed", body: x.status + " · " + x.notes, kind: "QUALITY", entityId: evidence.id } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "KITCHEN_EVIDENCE_REVIEW", entityType: "KitchenEvidence", entityId: evidence.id, newValue: { status: x.status, notes: x.notes } } });
      } else if (x.action === "inspection") {
        const kitchen = await tx.kitchen.findUniqueOrThrow({ where: { id: x.kitchenId } });
        if (new Date(x.inspectedAt).getTime() > Date.now() + 60_000) throw new QualityError("An inspection must have already taken place.");
        const inspection = await tx.qualityCheck.create({ data: { kitchenId: kitchen.id, motherId: kitchen.motherId, inspectorUserId: user.id, status: x.status, score: x.score, notes: x.notes, correctiveAction: x.correctiveAction, inspectedAt: new Date(x.inspectedAt) } });
        await tx.adminActivityLog.create({ data: { adminId: user.id, action: "KITCHEN_INSPECTION", entityType: "QualityCheck", entityId: inspection.id, newValue: x } });
      } else if (x.action === "training") {
        await tx.kitchen.findUniqueOrThrow({ where: { id: x.kitchenId } });
        await tx.kitchenTraining.create({ data: { kitchenId: x.kitchenId, assignedBy: user.id, topic: x.topic, notes: x.notes, dueAt: new Date(x.dueAt) } });
      } else {
        const training = await tx.kitchenTraining.findUniqueOrThrow({ where: { id: x.id } });
        if (user.role === "MOTHER") {
          if (x.status !== "SUBMITTED" || training.status !== "ASSIGNED" || !await tx.kitchen.findFirst({ where: { id: training.kitchenId, mother: { userId: user.id } } })) throw new QualityError("Only your assigned training can be submitted for review.");
        } else if (x.status !== "COMPLETED" || training.status !== "SUBMITTED") throw new QualityError("The mother must submit the training before completion is recorded.");
        await tx.kitchenTraining.update({ where: { id: training.id }, data: { status: x.status, completedAt: x.status === "COMPLETED" ? new Date() : null } });
        if (user.role === "ADMIN") await tx.adminActivityLog.create({ data: { adminId: user.id, action: "TRAINING_COMPLETED", entityType: "KitchenTraining", entityId: training.id, newValue: { status: x.status } } });
      }
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof QualityError ? error.message : "Could not save this quality record." }, { status: 409 });
  }
}
