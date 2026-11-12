import { prisma } from "@/lib/prisma";
import { distanceMeters } from "@/lib/marketplace-rules";
import { DEFAULT_ESTIMATE_POLICY, estimateShares, type EstimatePolicy } from "@/lib/earnings-estimates";
export async function loadEstimatePolicy(): Promise<EstimatePolicy> {
  const p = await prisma.earningsEstimatePolicy.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  return p ? { motherBasisPoints: p.motherBasisPoints, courierBase: Number(p.courierBase), includedKm: Number(p.includedKm), perKm: Number(p.perKm), courierCap: Number(p.courierCap) } : DEFAULT_ESTIMATE_POLICY;
}
export function orderDistance(kitchen: { latitude: unknown; longitude: unknown }, address: { latitude: unknown; longitude: unknown }) {
  if (kitchen.latitude == null || kitchen.longitude == null || address.latitude == null || address.longitude == null) return null;
  return distanceMeters({ latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }, { latitude: Number(address.latitude), longitude: Number(address.longitude) }) / 1000;
}
export async function loadPartnerIncome(userId: string, role: "MOTHER" | "DELIVERY_AGENT", days: number) {
  const since = new Date(Date.now() - days * 86400000), policy = await loadEstimatePolicy();
  const [orders, ledger, payouts] = await Promise.all([
    prisma.order.findMany({ where: { orderNumber: { not: { startsWith: "TEST-LIFE-" } }, ...(role === "MOTHER" ? { mother: { userId } } : { delivery: { agent: { userId } } }), OR: [{ status: { notIn: ["DELIVERED", "CANCELLED", "FAILED"] } }, { scheduledFor: { gte: since } }] }, include: { kitchen: { select: { name: true, latitude: true, longitude: true } }, address: { select: { latitude: true, longitude: true } }, delivery: { select: { estimatedPayout: true } } }, orderBy: { scheduledFor: "desc" } }),
    prisma.earning.findMany({ where: { userId, beneficiaryRole: role, currency: "INR", OR: [{createdAt:{gte:since}},{status:{in:["AVAILABLE","PENDING"]}}], order: { orderNumber: { not: { startsWith: "TEST-LIFE-" } } } }, orderBy: { createdAt: "desc" }, include: { order: { select: { orderNumber: true } } } }),
    prisma.payout.findMany({ where: { userId, currency: "INR", OR:[{requestedAt:{gte:since}},{processedAt:{gte:since}}] }, orderBy: { requestedAt: "desc" } }),
  ]);
  const rows = orders.map(o => { const shares = estimateShares(Number(o.subtotal), Number(o.deliveryFee), orderDistance(o.kitchen, o.address), policy, o.delivery?.estimatedPayout == null ? null : Number(o.delivery.estimatedPayout)); return { id: o.id, orderNumber: o.orderNumber, kitchen: o.kitchen.name, status: o.status, scheduledFor: o.scheduledFor.toISOString(), estimate: role === "MOTHER" ? shares.mother : shares.courier }; });
  const total = (status: string) => ledger.filter(r => r.status === status).reduce((n,r) => n + Number(r.netAmount), 0);
  const monthStart = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0,7) + "-01T00:00:00+05:30");
  const monthEnd = new Date(monthStart); monthEnd.setUTCMonth(monthEnd.getUTCMonth()+1);
  const monthRecorded = await prisma.earning.aggregate({ where: { userId, beneficiaryRole: role, status: { not: "REVERSED" }, createdAt: { gte: monthStart }, order: { orderNumber: { not: { startsWith: "TEST-LIFE-" } } } }, _sum: { netAmount: true } });
  return { monthRecorded: Number(monthRecorded._sum.netAmount ?? 0), monthBooked: rows.filter(row => !["CANCELLED", "FAILED"].includes(row.status) && new Date(row.scheduledFor) >= monthStart && new Date(row.scheduledFor) < monthEnd).reduce((sum,row) => sum+row.estimate,0), policy, days, currency: "INR", totals: { recorded: ledger.filter(r => r.status !== "REVERSED" && r.createdAt >= since).reduce((n,r) => n + Number(r.netAmount),0), available: total("AVAILABLE"), pending: total("PENDING"), payoutPaid: payouts.filter(p => p.status === "PAID" && p.processedAt && p.processedAt >= since).reduce((n,p) => n + Number(p.amount),0), completedEstimate: rows.filter(r => r.status === "DELIVERED").reduce((n,r) => n+r.estimate,0), futureEstimate: rows.filter(r => !["DELIVERED","FAILED","CANCELLED"].includes(r.status)).reduce((n,r) => n+r.estimate,0) }, rows: rows.slice(0,30), ledger: ledger.filter(r=>r.createdAt>=since).slice(0,20).map(r => ({ id:r.id,orderNumber:r.order.orderNumber,status:r.status,amount:Number(r.netAmount),at:r.createdAt.toISOString() })), payouts:payouts.slice(0,10).map(p => ({ id:p.id,status:p.status,amount:Number(p.amount),at:p.requestedAt.toISOString() })) };
}
