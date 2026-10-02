import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminCreateSchema } from "@/lib/auth-validation";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN" || actor.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only an active administrator can create another admin account." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the new admin account details." }, { status: 400 }); }
  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the admin account details." }, { status: 400 });

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email.toLowerCase();
  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: { name: parsed.data.name, email, username, passwordHash, role: "ADMIN", status: "ACTIVE" },
        select: { id: true, name: true, email: true, username: true, role: true, createdAt: true },
      });
      await tx.adminActivityLog.create({
        data: {
          adminId: actor.id,
          action: "ADMIN_ACCOUNT_CREATED",
          entityType: "USER",
          entityId: admin.id,
          newValue: { name: admin.name, email: admin.email, username: admin.username, role: admin.role },
        },
      });
      return admin;
    });
    return NextResponse.json({ created: true, admin: created, message: "Admin account created. The password is stored as a secure hash." }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
    }
    console.error("Pausstik admin account creation failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
