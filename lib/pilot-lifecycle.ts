import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
export const TEST_ORDER_PREFIX = "TEST-LIFE-";
export async function seedPilotLifecycle() {
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended('paustik-pilot-lifecycle-v1',0))`;
    const person = async (tag: string, role: "CUSTOMER" | "MOTHER" | "DELIVERY_AGENT") => {
      const email = `pilot.lifecycle.${tag}@paustik.invalid`; const old = await tx.user.findUnique({ where: { email } });
      if (old && (!old.name.startsWith("[TEST]") || old.role !== role)) throw new Error("PILOT_IDENTITY_CONFLICT");
      return old ?? tx.user.create({ data: { email, name: `[TEST] Lifecycle ${tag}`, role, status: "SUSPENDED", passwordHash } });
    };
    const customer = await person("customer", "CUSTOMER"); const motherUser = await person("mother", "MOTHER"); const courierUser = await person("courier", "DELIVERY_AGENT");
    const mother = await tx.motherProfile.upsert({ where: { userId: motherUser.id }, create: { userId: motherUser.id, cuisine: "Test home-style", verificationStatus: "PENDING" }, update: {} });
    const courier = await tx.deliveryAgentProfile.upsert({ where: { userId: courierUser.id }, create: { userId: courierUser.id, vehicleType: "TEST ONLY", verificationStatus: "PENDING" }, update: {} });
    const kitchen = await tx.kitchen.upsert({ where: { motherId: mother.id }, create: { motherId: mother.id, name: "[TEST] Lifecycle kitchen", addressLine1: "Synthetic test address", locality: "Test area", city: "Test city", pinCode: "000000", cuisine: "Test home-style", isAcceptingOrders: false, verificationStatus: "PENDING" }, update: {} });
    let address = await tx.address.findFirst({ where: { userId: customer.id } });
    address ??= await tx.address.create({ data: { userId: customer.id, recipientName: "[TEST] Customer", phone: "0000000000", addressLine1: "Synthetic test address", locality: "Test area", city: "Test city", pinCode: "000000" } });
    let meal = await tx.meal.findFirst({ where: { kitchenId: kitchen.id, name: "[TEST] Rice, dal & vegetables" } });
    meal ??= await tx.meal.create({ data: { kitchenId: kitchen.id, name: "[TEST] Rice, dal & vegetables", category: "VEGETARIAN", tier: "BASE", cuisine: "Test", components: ["Rice", "Dal", "Vegetables"], price: 69, isAvailable: false } });
    const result = [];
    for (let n = 1; n <= 5; n++) {
      const orderNumber = TEST_ORDER_PREFIX + String(n).padStart(3, "0"); const existing = await tx.order.findUnique({ where: { orderNumber }, select: { id: true } });
      if (existing) { result.push({ id: existing.id, orderNumber }); continue; }
      const start = new Date(Date.now() - (n + 1) * 86400000); const at = (minutes: number) => new Date(start.getTime() + minutes * 60000);
      const order = await tx.order.create({ data: { orderNumber, customerId: customer.id, motherId: mother.id, kitchenId: kitchen.id, addressId: address.id, status: "DELIVERED", paymentStatus: "CAPTURED", orderedAt: start, scheduledFor: at(70), subtotal: 69, deliveryFee: 30, totalAmount: 99, notes: "TEST ONLY: simulated lifecycle. No cash payment, bank payout, SMS or physical delivery.", policySnapshot: { testRecord: true, settlement: "SIMULATED_TEST_CREDIT" }, items: { create: { mealId: meal.id, mealName: meal.name, quantity: 1, unitPrice: 69, lineTotal: 69 } }, events: { create: ["ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].map((status, index) => ({ status: status as "ORDER_PLACED" | "CONFIRMED" | "PREPARING" | "READY_FOR_PICKUP" | "DELIVERY_ASSIGNED" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED", actorUserId: index < 1 ? customer.id : index < 4 ? motherUser.id : courierUser.id, detail: "TEST ONLY · simulated lifecycle step", createdAt: at(index * 10) })) }, delivery: { create: { agentId: courier.id, status: "DELIVERED", assignedAt: at(40), acceptedAt: at(42), pickupAt: at(50), deliveredAt: at(70), trackingReference: orderNumber } } } });
      await tx.walletLedgerEntry.createMany({ data: [{ userId: customer.id, orderId: order.id, direction: "CREDIT", amount: 99, reference: "fixture-credit:" + order.id, description: "TEST ONLY: simulated credit", metadata: { testCredit: true, testRecord: true } }, { userId: customer.id, orderId: order.id, direction: "DEBIT", amount: 99, reference: "fixture-debit:" + order.id, description: "TEST ONLY: simulated order settlement", metadata: { testRecord: true } }] });
      await tx.rating.createMany({ data: [{ orderId: order.id, authorId: customer.id, subjectId: motherUser.id, mealId: meal.id, mealScore: n % 2 ? 5 : 4, comment: "TEST ONLY: sample food feedback." }, { orderId: order.id, authorId: customer.id, subjectId: courierUser.id, deliveryScore: n % 2 ? 4 : 5, comment: "TEST ONLY: sample delivery feedback." }] });
      result.push({ id: order.id, orderNumber });
    }
    return result;
  }, { timeout: 20000 });
}
