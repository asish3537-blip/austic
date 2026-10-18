import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ISSUER = "Pausstik";

function authKey(context: string) {
  const key = process.env.AUTH_SECRET;
  if (!key || key.length < 32) throw new Error("AUTH_SECRET_REQUIRED");
  return createHmac("sha256", key).update(context).digest();
}

export function encodeBase32(bytes: Buffer) {
  let bits = 0, value = 0, output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret: string) {
  if (!/^[A-Z2-7]+$/.test(secret)) throw new Error("INVALID_AUTHENTICATOR_SECRET");
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of secret) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

export function createAuthenticatorSecret() { return encodeBase32(randomBytes(20)); }

export function totpAtStep(secret: string, step: bigint, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(step);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, code: string, lastUsedStep: bigint | null = null, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const step = BigInt(Math.floor(now / 30000));
  for (const delta of [0, -1, 1]) {
    const candidate = step + BigInt(delta);
    if (candidate < BigInt(0) || (lastUsedStep !== null && candidate <= lastUsedStep)) continue;
    if (timingSafeEqual(Buffer.from(totpAtStep(secret, candidate)), Buffer.from(code))) return candidate;
  }
  return null;
}

export function encryptAuthenticatorSecret(secret: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authKey("pausstik:admin-totp:v1"), iv);
  cipher.setAAD(Buffer.from(`v1:${userId}`));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAuthenticatorSecret(value: string, userId: string) {
  const parts = value.split(".");
  const [version, iv, tag, encrypted] = parts;
  if (parts.length !== 4 || version !== "v1" || !iv || !tag || !encrypted || Buffer.from(iv, "base64url").length !== 12 || Buffer.from(tag, "base64url").length !== 16) throw new Error("INVALID_AUTHENTICATOR_SECRET");
  const decipher = createDecipheriv("aes-256-gcm", authKey("pausstik:admin-totp:v1"), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(`v1:${userId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function authenticatorUri(secret: string, email: string) {
  const params = new URLSearchParams({ secret, issuer: ISSUER, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${encodeURIComponent(`${ISSUER}:${email}`)}?${params}`;
}

export function createRecoveryCodes() {
  return Array.from({ length: 10 }, () => randomBytes(12).toString("hex").match(/.{6}/g)!.join("-"));
}

export function recoveryCodeHash(code: string, userId: string) {
  const normalized = code.trim().toLowerCase().replaceAll("-", "");
  if (!/^[a-f0-9]{24}$/.test(normalized)) return null;
  return createHmac("sha256", authKey("pausstik:admin-recovery:v1")).update(`${userId}:${normalized}`).digest("hex");
}
