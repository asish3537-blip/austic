import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { rejectCrossOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  try {
    await clearSession();
    return NextResponse.json({ signedOut: true });
  } catch {
    return NextResponse.json({ error: "Could not sign out. Please try again." }, { status: 503 });
  }
}
