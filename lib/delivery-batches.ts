import type { Prisma } from "@/app/generated/prisma/client";
import { ACTIVE_DELIVERY_STATES, batchProblem, type DeliveryStop, type DispatchSettings } from "@/lib/dispatch-rules";
import { indiaSchoolDate } from "@/lib/scoofoo-rules";

export class DispatchError extends Error {}
type OrderStop = { id: string; scheduledFor: Date; items: { quantity: number }[]; kitchen: { latitude: unknown; longitude: unknown }; address: { latitude: unknown; longitude: unknown } };
export function deliveryStop(id: string, order: OrderStop): DeliveryStop {
  if ([order.kitchen.latitude, order.kitchen.longitude, order.address.latitude, order.address.longitude].some(value => value == null)) throw new DispatchError("Accurate pickup and delivery pins are required for a batch.");
  return { id, quantity: order.items.reduce((sum, item) => sum + item.quantity, 0), scheduledFor: order.scheduledFor,
    pickup: { latitude: Number(order.kitchen.latitude), longitude: Number(order.kitchen.longitude) },
    dropoff: { latitude: Number(order.address.latitude), longitude: Number(order.address.longitude) } };
}

export async function lockCourier(tx: Prisma.TransactionClient, agentId: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"courier:" + agentId},0))`;
}

export async function assertBatchCapacity(tx: Prisma.TransactionClient, agentId: string, candidates: { id: string; order: OrderStop }[], capacity: number, policy: DispatchSettings) {
  if(await tx.scoofooBooking.count({where:{courierId:agentId,serviceDate:{lte:indiaSchoolDate()},status:{in:["CONFIRMED","READY","PICKED_UP","AT_SCHOOL","EXCEPTION"]}}}))throw new DispatchError("Complete your dedicated ScooFoo school route before accepting Paustik deliveries.");
  const active = await tx.delivery.findMany({ where: { agentId, status: { in: [...ACTIVE_DELIVERY_STATES] } }, include: { order: { include: { kitchen: true, address: true, items: true, bulkDeliveryRequest: true } } } });
  if (active.some(delivery => delivery.order.bulkDeliveryRequest)) throw new DispatchError("Complete your arranged bulk delivery before taking local orders.");
  if (candidates.length && active.some(delivery => ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(delivery.status))) throw new DispatchError("Your collection batch has closed. Complete these deliveries before adding orders.");
  const stops = [...active, ...candidates].map(delivery => deliveryStop(delivery.id, delivery.order));
  const problem = batchProblem(stops, capacity, policy);
  if (problem) throw new DispatchError(problem);
  return active;
}
