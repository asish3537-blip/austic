import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadPartnerIncome } from "@/lib/partner-income";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || (user.role !== "MOTHER" && user.role !== "DELIVERY_AGENT")) return NextResponse.json({ error: "Partner access required." }, { status: 403 });
  const value = Number(request.nextUrl.searchParams.get("days") || 30), days = [7,30,90].includes(value) ? value : 30;
  return NextResponse.json(await loadPartnerIncome(user.id,user.role,days), { headers: { "Cache-Control": "private, no-store" } });
}
