import { ensurePilotWallet } from "@/lib/pilot-wallet";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { distanceMeters, lockWallet, walletBalance } from "@/lib/marketplace-rules";
import { CheckoutError, inputHash, priceCheckout } from "@/lib/checkout-pricing";

const schema = z.object({ menuIds: z.array(z.string().uuid()).min(1).max(7).optional(), productRequestId: z.string().uuid().optional(), quantity: z.number().int().min(1).max(8).default(1), couponCode: z.string().max(40).optional() }).refine(value => Boolean(value.menuIds) !== Boolean(value.productRequestId));
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "Customer sign-in required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose meals or a product request to review." }, { status: 400 });
  try {
    const x = parsed.data;
    const address = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    const menus = x.menuIds ? await prisma.menu.findMany({ where: { id: { in: x.menuIds } }, include: { meal: true, kitchen: true }, orderBy: { serviceDate: "asc" } }) : [];
    const product = x.productRequestId ? await prisma.productRequest.findFirst({ where: { id: x.productRequestId, customerId: user.id }, include: { address: true, product: { include: { meal: { include: { kitchen: true } } } } } }) : null;
    const destination = product?.address ?? address;
    const kitchen = product?.product.meal.kitchen ?? menus[0]?.kitchen;
    if (!destination || !kitchen || destination.latitude === null || destination.longitude === null || kitchen.latitude === null || kitchen.longitude === null) throw new CheckoutError("Save a delivery pin and choose an available kitchen first.");
    if (x.menuIds && (menus.length !== x.menuIds.length || menus.some(menu => menu.kitchenId !== kitchen.id))) throw new CheckoutError("Choose available menus from one kitchen.");
    if (x.productRequestId && (!product || product.status !== "CUSTOMER_CONFIRM" || product.expiresAt <= new Date())) throw new CheckoutError("The kitchen must agree to your product request before checkout.");
    const distanceKm = distanceMeters({ latitude: Number(destination.latitude), longitude: Number(destination.longitude) }, { latitude: Number(kitchen.latitude), longitude: Number(kitchen.longitude) }) / 1000;
    const input = { target: product ? `product:${product.id}:${product.version}` : `menus:${menus.map(menu => menu.id).sort().join(",")}:${x.quantity}`, food: product ? [Number(product.unitPrice) * product.quantity] : menus.map(menu => Number(menu.meal.price) * x.quantity), distanceKm, couponCode: (x.couponCode || "").trim().toUpperCase() };
    const result = await prisma.$transaction(async tx => {
      await lockWallet(tx, user.id);
      await ensurePilotWallet(tx, user.id);
      const pricing = await priceCheckout(tx, user.id, input);
      const quote = await tx.checkoutQuote.create({ data: { customerId: user.id, inputHash: inputHash(input), payload: pricing, expiresAt: new Date(Date.now() + 15 * 60_000) } });
      const walletApplied = Math.min(await walletBalance(tx, user.id), pricing.total);
      return { ...pricing, quoteId: quote.id, expiresAt: quote.expiresAt, walletApplied, amountDue: Math.round((pricing.total - walletApplied) * 100) / 100 };
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 409 });
    return serviceUnavailable();
  }
}
