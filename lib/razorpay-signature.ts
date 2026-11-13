import { createHmac, timingSafeEqual } from "node:crypto";
export function validRazorpaySignature(message: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(createHmac("sha256", secret).update(message).digest("hex"), "hex"), Buffer.from(signature, "hex"));
}
