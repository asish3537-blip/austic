import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { seedPilotLifecycle } from "@/lib/pilot-lifecycle";
import { pilotWalletEnabled } from "@/lib/pilot-wallet";
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const configured = process.env.PAUSTIK_PILOT_SEED_TOKEN || "";
  const digest = (v: string) => createHash("sha256").update(v).digest();
  const authorizedJob = configured.length >= 32 && timingSafeEqual(digest(supplied), digest(configured));
  if ((!user || user.role !== "ADMIN" || user.status !== "ACTIVE") && !authorizedJob) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  if (!pilotWalletEnabled()) return NextResponse.json({ error: "Pilot test data is disabled." }, { status: 409 });
  try { const orders = await seedPilotLifecycle(); return NextResponse.json({ orders, message: "Five marked test lifecycle orders are ready. No money was collected and no delivery was dispatched." }, { headers: { "Cache-Control": "no-store" } }); } catch (e) { console.error("Pilot lifecycle seed failed.", e instanceof Error ? e.name : "unknown"); return serviceUnavailable(); }
}
