import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isLocalAuthMode } from "@/lib/local-auth-mode";

const SESSION_COOKIE = "paustik_session";
const SESSION_DAYS = 30;

export type AppRole = "CUSTOMER" | "MOTHER" | "DELIVERY_AGENT" | "ADMIN";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  emailVerifiedAt: Date | null;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  if (isLocalAuthMode()) {
    const local = await import("@/lib/local-auth-db");
    local.createLocalSession(userId, sha256(rawToken), expiresAt);
  } else {
    await prisma.authSession.create({
      data: { userId, tokenHash: sha256(rawToken), expiresAt },
    });
  }
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    if (isLocalAuthMode()) {
      const local = await import("@/lib/local-auth-db");
      local.revokeLocalSession(sha256(rawToken));
    } else {
      await prisma.authSession.updateMany({
        where: { tokenHash: sha256(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  if (isLocalAuthMode()) {
    const local = await import("@/lib/local-auth-db");
    const user = local.findLocalUserForSession(sha256(rawToken));
    if (!user || user.status === "SUSPENDED" || user.status === "REJECTED") return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (session.user.status === "SUSPENDED" || session.user.status === "REJECTED") {
    await prisma.authSession.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as AppRole,
    status: session.user.status,
    emailVerifiedAt: session.user.emailVerifiedAt,
  };
});

export function roleHome(user: Pick<SessionUser, "role" | "status">) {
  if (user.status !== "ACTIVE") return "/account/pending";
  switch (user.role) {
    case "CUSTOMER": return "/customer/dashboard";
    case "MOTHER": return "/mother/dashboard";
    case "DELIVERY_AGENT": return "/delivery/dashboard";
    case "ADMIN": return "/admin/dashboard";
  }
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireRole(role: AppRole) {
  const user = await requireAuthenticatedUser();
  if (user.status !== "ACTIVE") redirect("/account/pending");
  if (user.role !== role) redirect(roleHome(user));
  return user;
}

export async function sessionUserFromRequest() {
  return getCurrentUser();
}
