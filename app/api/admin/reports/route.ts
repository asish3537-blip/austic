import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportDays, reportStart } from "@/lib/admin-report";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const days = reportDays(new URL(request.url).searchParams.get("days") || undefined); const now = new Date(); const since = new Date(reportStart(days, now));
  const [orders, payments, fees] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { orderNumber: { not: { startsWith: "TEST-LIFE-" } }, orderedAt: { gte: since, lte: now } }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["currency", "status"], where: { capturedAt: { gte: since, lte: now } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.paymentLedgerEntry.groupBy({ by: ["currency"], where: { category: "PLATFORM_FEE", createdAt: { gte: since, lte: now } }, _sum: { amount: true } }),
  ]);
  const rows = [["Period start (UTC)", since.toISOString()], ["Snapshot (UTC)", now.toISOString()], [], ["Metric", "Status", "Currency", "Count", "Amount"], ...orders.map(o => ["Orders placed", o.status, "", o._count._all, ""]), ...payments.map(p => ["Captured customer receipts before refunds", p.status, p.currency, p._count._all, Number(p._sum.amount ?? 0)]), ...fees.map(f => ["Recorded platform fees (not profit)", "", f.currency, "", Number(f._sum.amount ?? 0)])];
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="paustik-analytics-${days}days.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
