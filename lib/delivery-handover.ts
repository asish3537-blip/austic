import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function newHandoverNonce() { return randomBytes(32).toString("hex"); }

export function deliveryHandoverCode(deliveryId: string, nonce: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Delivery verification requires AUTH_SECRET.");
  const digest = createHmac("sha256", secret).update(`paustik:delivery:${deliveryId}:${nonce}`).digest();
  return (digest.readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
}

export function matchesHandoverCode(deliveryId: string, nonce: string, code: string) {
  return /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(code), Buffer.from(deliveryHandoverCode(deliveryId, nonce)));
}
