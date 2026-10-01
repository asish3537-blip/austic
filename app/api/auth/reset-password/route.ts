import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/auth-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!process.env.DATABASE_URL) return serviceUnavailable();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the reset code and a new password." }, { status: 400 }); }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the password and try again." }, { status: 400 });
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= now) throw new Error("RESET_TOKEN_INVALID");
      const consumed = await tx.passwordResetToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (consumed.count !== 1) throw new Error("RESET_TOKEN_INVALID");
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.authSession.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: now } });
    });
    return NextResponse.json({ reset: true });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_INVALID") {
      return NextResponse.json({ error: "This reset link is expired or has already been used." }, { status: 400 });
    }
    console.error("Paustik password update failed.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
