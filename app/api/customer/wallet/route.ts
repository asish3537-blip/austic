import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { lockWallet, walletBalance } from "@/lib/marketplace-rules";
import { ensurePilotWallet, pilotWalletEnabled, PILOT_STARTER_CREDIT, PILOT_TOPUP_LIMIT } from "@/lib/pilot-wallet";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  }
  try {
    // A consistent snapshot prevents a concurrent starter credit from reporting balance 0 with starterGranted true.
    const [balance, entries, topups, starter] = await prisma.$transaction(async tx => Promise.all([
      walletBalance(tx, user.id),
      tx.walletLedgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      tx.walletLedgerEntry.aggregate({ where: { userId: user.id, reference: { startsWith: "pilot-topup:" + user.id + ":" }, direction: "CREDIT" }, _sum: { amount: true } }),
      tx.walletLedgerEntry.findUnique({ where: { reference: "pilot-starter:" + user.id }, select: { id: true } }),
    ]), { isolationLevel: "RepeatableRead" });
    return NextResponse.json({ currency: "INR", balance, pilot: { enabled: pilotWalletEnabled(), starterGranted: Boolean(starter), starterAmount: PILOT_STARTER_CREDIT, topUpRemaining: Math.max(0, PILOT_TOPUP_LIMIT - Number(topups._sum.amount ?? 0)), topUpLimit: PILOT_TOPUP_LIMIT }, entries: entries.map((entry) => ({
      id: entry.id, direction: entry.direction, amount: Number(entry.amount), description: entry.description,
      createdAt: entry.createdAt.toISOString(), orderId: entry.orderId,
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Paustik customer wallet could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}

const creditSchema = z.discriminatedUnion("action", [z.object({ action: z.literal("starter") }), z.object({ action: z.literal("topup"), amount: z.number().int().min(1).max(PILOT_TOPUP_LIMIT), requestId: z.string().uuid() })]);
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request); if (blocked) return blocked;
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  if (!pilotWalletEnabled()) return NextResponse.json({ error: "Test wallet credit is not enabled." }, { status: 409 });
  const parsed = creditSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a whole-rupee test credit between ₹1 and ₹500." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      await lockWallet(tx, user.id); await ensurePilotWallet(tx, user.id);
      const input = parsed.data;
      if (input.action === "topup") {
        const reference = "pilot-topup:" + user.id + ":" + input.requestId;
        const existing = await tx.walletLedgerEntry.findUnique({ where: { reference } });
        if (existing && Number(existing.amount) !== input.amount) throw new Error("CREDIT_CONFLICT");
        if (!existing) {
          const added = await tx.walletLedgerEntry.aggregate({ where: { userId: user.id, reference: { startsWith: "pilot-topup:" + user.id + ":" }, direction: "CREDIT" }, _sum: { amount: true } });
          if (Number(added._sum.amount ?? 0) + input.amount > PILOT_TOPUP_LIMIT) throw new Error("CREDIT_LIMIT");
          await tx.walletLedgerEntry.create({ data: { userId: user.id, direction: "CREDIT", amount: input.amount, currency: "INR", reference, description: "Pilot test top-up · no payment collected", metadata: { testCredit: true, withdrawable: false, source: "PILOT_TOPUP" } } });
        }
      }
      return { balance: await walletBalance(tx, user.id) };
    });
    return NextResponse.json({ ...result, message: parsed.data.action === "starter" ? "₹555 pilot test credit is ready. No money was charged." : "Test credit added. No real payment was collected." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "CREDIT_LIMIT") return NextResponse.json({ error: "You can add at most ₹500 in extra test credit per account during this pilot." }, { status: 409 });
    if (error instanceof Error && error.message === "CREDIT_CONFLICT") return NextResponse.json({ error: "That top-up request was already used for a different amount." }, { status: 409 });
    console.error("Paustik pilot wallet credit failed.", error instanceof Error ? error.name : "unknown");
    return serviceUnavailable();
  }
}
