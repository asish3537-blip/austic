import { NextResponse } from "next/server";
import { loadKitchenDirectory } from "@/lib/customer-kitchens";

export async function GET(request: Request) {
  const city = (new URL(request.url).searchParams.get("city") || "").trim();
  if (!city || city.length > 80) return NextResponse.json({ error: "Enter a city." }, { status: 400 });
  try {
    const kitchens = await loadKitchenDirectory(city);
    return NextResponse.json({ kitchens }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return NextResponse.json({ error: "The kitchen directory is temporarily unavailable." }, { status: 503 });
  }
}
