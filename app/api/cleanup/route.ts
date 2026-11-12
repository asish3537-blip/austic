import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireOverdueOrders } from "@/lib/overdue-orders";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "Scheduled cleanup needs CRON_SECRET." }, { status: 503 });
  const actual = request.headers.get("authorization") ?? "";
  const token = "Bearer " + expected;
  if (Buffer.byteLength(actual) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(actual), Buffer.from(token))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await expireOverdueOrders());
}
