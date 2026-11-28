import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleClientId } from "@/lib/easy-sign-in";
import { rejectCrossOrigin } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  const clientId = googleClientId();
  if (!clientId) return NextResponse.json({ error: "Google sign-in is not activated yet. Use email instead." }, { status: 503 });
  const nonce = randomBytes(32).toString("base64url");
  (await cookies()).set("paustik_google_nonce", nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600 });
  return NextResponse.json({ clientId, nonce }, { headers: { "Cache-Control": "no-store" } });
}
