import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminOperationsMap, type AdminMapPoint } from "@/components/admin-operations-map";
export const dynamic = "force-dynamic";
export default async function AdminMap() {
  await requireRole("ADMIN"); const now = new Date();
  const [kitchens, deliveries, missing] = await Promise.all([
    prisma.kitchen.findMany({ where: { latitude: { not: null }, longitude: { not: null } }, take: 200, orderBy: { name: "asc" }, select: { id: true, name: true, locality: true, city: true, latitude: true, longitude: true, isAcceptingOrders: true, marketplaceRadiusMeters: true } }),
    prisma.delivery.findMany({ where: { status: { in: ["ASSIGNED", "ACCEPTED", "GOING_TO_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"] }, locationConsentAt: { not: null }, locationUpdatedAt: { gte: new Date(now.getTime() - 120000), lte: now }, currentAccuracyMeters: { lte: 50 }, currentLatitude: { not: null }, currentLongitude: { not: null } }, take: 100, orderBy: { locationUpdatedAt: "desc" }, include: { order: { select: { orderNumber: true } }, agent: { select: { user: { select: { name: true } } } } } }),
    prisma.kitchen.count({ where: { OR: [{ latitude: null }, { longitude: null }] } }),
  ]);
  const points: AdminMapPoint[] = [...kitchens.map(k => ({ id: k.id, kind: "Kitchen" as const, name: k.name, detail: `${k.locality}, ${k.city} · ${k.isAcceptingOrders ? "Accepting orders" : "Paused"} · ${(k.marketplaceRadiusMeters / 1000).toFixed(1)} km service radius`, lat: Number(k.latitude), lng: Number(k.longitude) })), ...deliveries.map(d => ({ id: d.id, kind: "Courier" as const, name: d.agent?.user.name || "Assigned courier", detail: d.order.orderNumber, lat: Number(d.currentLatitude), lng: Number(d.currentLongitude), updated: d.locationUpdatedAt!.toISOString() }))].filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  return <main className="console-page"><div className="console-page-head"><div><span className="eyebrow">Delivery & coverage</span><h1>Your neighbourhood, connected.</h1><p>{kitchens.length} mapped kitchens · {deliveries.length} recent courier locations · {missing} kitchens need coordinates</p></div></div><AdminOperationsMap points={points} snapshot={now.toISOString()}/><p className="console-footnote">Shows up to 200 kitchens and 100 active delivery locations. GPS must be shared from the courier app; this page cannot turn on a courier’s phone location.</p></main>;
}
