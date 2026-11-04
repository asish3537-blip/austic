import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { localAdminPreviewEnabled } from "@/lib/local-admin-preview";
import { adminCreateSchema } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { rejectCrossOrigin } from "@/lib/http";

export async function POST(request: Request) {
  if (!localAdminPreviewEnabled() || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const originError = rejectCrossOrigin(request); if (originError) return originError;
  const parsed = adminCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the account details." }, { status: 400 });
  try {
    const input = parsed.data;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const admin = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: input.name, username: input.username.toLowerCase(), email: input.email.toLowerCase(), passwordHash, role: "ADMIN", status: "ACTIVE", emailVerifiedAt: new Date() } });
      await tx.adminActivityLog.create({ data: { adminId: user.id, action: "LOCAL_PREVIEW_ADMIN_CREATED", entityType: "USER", entityId: user.id } });
      return user;
    });
    await createSession(admin.id, admin.adminAuthVersion);
    return NextResponse.json({ created: true, destination: "/admin/security?setup=1" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "That email or username is already registered. Sign in or choose another." }, { status: 409 });
    return NextResponse.json({ error: "Could not create the local admin account." }, { status: 503 });
  }
}

