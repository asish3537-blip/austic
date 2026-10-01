import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export type OtpPurpose = "signup" | "login";

const COOKIE_NAME = "paustik_demo_otp";
const CODE_TTL_SECONDS = 10 * 60;
const COOKIE_PATH = "/api/auth";

type DemoChallenge = {
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: number;
  nonce: string;
};

export function isDemoAuthEnabled() {
  return process.env.PAUSTIK_DEMO_AUTH === "true";
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required for demo authentication.");
  return value;
}

function hmac(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function sign(encodedPayload: string) {
  return hmac(`challenge:${encodedPayload}`);
}

export function createDemoOtp(phone: string, purpose: OtpPurpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challenge: DemoChallenge = {
    phone,
    purpose,
    codeHash: hmac(`code:${phone}:${purpose}:${code}`),
    expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
    nonce: randomBytes(12).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return { code, token: `${encodedPayload}.${sign(encodedPayload)}` };
}

export function attachDemoOtpCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: CODE_TTL_SECONDS,
  });
}

export function clearDemoOtpCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

export function verifyDemoOtp(request: Request, phone: string, purpose: OtpPurpose, code: string) {
  try {
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
    if (!cookie) return false;
    const token = cookie.slice(COOKIE_NAME.length + 1);
    const [encodedPayload, providedSignature, ...extra] = token.split(".");
    if (!encodedPayload || !providedSignature || extra.length) return false;

    const expectedSignature = Buffer.from(sign(encodedPayload), "hex");
    const actualSignature = Buffer.from(providedSignature, "hex");
    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return false;

    const challenge = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as DemoChallenge;
    if (challenge.phone !== phone || challenge.purpose !== purpose || challenge.expiresAt <= Date.now()) return false;
    const expectedCodeHash = Buffer.from(challenge.codeHash, "hex");
    const actualCodeHash = Buffer.from(hmac(`code:${phone}:${purpose}:${code}`), "hex");
    return expectedCodeHash.length === actualCodeHash.length && timingSafeEqual(expectedCodeHash, actualCodeHash);
  } catch {
    return false;
  }
}

