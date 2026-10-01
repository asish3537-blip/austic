import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLocalAuthMode } from "@/lib/local-auth-mode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const localAuth = isLocalAuthMode();
  if ((!localAuth && !process.env.DATABASE_URL) || token.length < 32 || token.length > 256) {
    return NextResponse.redirect(new URL("/verify-email?state=invalid", request.url));
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      const verified = local.verifyLocalEmail(tokenHash, now);
      return NextResponse.redirect(new URL(verified ? "/verify-email?state=verified" : "/verify-email?state=invalid", request.url));
    } catch {
      return NextResponse.redirect(new URL("/verify-email?state=invalid", request.url));
    }
  }
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const verification = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      if (!verification || verification.usedAt || verification.expiresAt <= now) return false;
      const consumed = await tx.emailVerificationToken.updateMany({ where: { id: verification.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: verification.userId }, data: { emailVerifiedAt: now } });
      return true;
    });
    return NextResponse.redirect(new URL(outcome ? "/verify-email?state=verified" : "/verify-email?state=invalid", request.url));
  } catch {
    return NextResponse.redirect(new URL("/verify-email?state=invalid", request.url));
  }
}
