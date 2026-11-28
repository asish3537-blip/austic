import { NextResponse } from "next/server";
import { googleClientId } from "@/lib/easy-sign-in";
import { emailConfig } from "@/lib/email";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ google: Boolean(googleClientId()), emailCode: Boolean(emailConfig()) }, { headers: { "Cache-Control": "no-store" } });
}
