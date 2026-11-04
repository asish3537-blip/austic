import type { Prisma } from "@/app/generated/prisma/client";
export const PILOT_STARTER_CREDIT = 555;
export const PILOT_TOPUP_LIMIT = 500;
export function pilotWalletEnabled() { return process.env.PAUSTIK_PILOT_WALLET_ENABLED === "true"; }
// Caller must hold the same customer wallet lock used by checkout and cancellation.
export async function ensurePilotWallet(tx: Prisma.TransactionClient, userId: string) {
  if (!pilotWalletEnabled()) return;
  const reference = "pilot-starter:" + userId;
  if (await tx.walletLedgerEntry.findUnique({ where: { reference } })) return;
  await tx.walletLedgerEntry.create({ data: { userId, direction: "CREDIT", amount: PILOT_STARTER_CREDIT, currency: "INR", reference, description: "Pilot test credit · not a cash deposit", metadata: { testCredit: true, withdrawable: false, source: "PILOT_STARTER" } } });
}
