import { createHmac, randomInt } from "node:crypto";

export function emailLoginHash(email: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET_REQUIRED");
  return createHmac("sha256", process.env.AUTH_SECRET).update(`email-login:${email.toLowerCase()}:${code}`).digest("hex");
}

export function newEmailCode() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }

export function googleClientId() { return process.env.GOOGLE_CLIENT_ID?.trim() || null; }

export function googleCanLinkEmail(email: string, hostedDomain?: string) {
  return email.toLowerCase().endsWith("@gmail.com") || Boolean(hostedDomain);
}
