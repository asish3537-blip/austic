import {livePaymentKey,allowPilotCredit,needsLiveWalletReview} from "@/lib/pilot-wallet-policy";
import {CheckoutError} from "@/lib/checkout-pricing";
import type { Prisma } from "@/app/generated/prisma/client";
export const PILOT_STARTER_CREDIT = 555;
export const PILOT_TOPUP_LIMIT = 500;
export function livePaymentMode(){return livePaymentKey(process.env.RAZORPAY_KEY_ID);}
export function pilotWalletEnabled() { return allowPilotCredit(process.env.PAUSTIK_PILOT_WALLET_ENABLED,process.env.RAZORPAY_KEY_ID); }
// Caller must hold the same customer wallet lock used by checkout and cancellation.
export async function ensurePilotWallet(tx: Prisma.TransactionClient, userId: string) {
  if(livePaymentMode()){
    const [pilotCredit,testPayment]=await Promise.all([
      tx.walletLedgerEntry.findFirst({where:{userId,OR:[{reference:{startsWith:"pilot-starter:"+userId}},{reference:{startsWith:"pilot-topup:"+userId+":"}}]},select:{id:true}}),
      tx.payment.findFirst({where:{provider:"razorpay",status:{in:["CAPTURED","REFUNDED"]},order:{customerId:userId},OR:[{idempotencyKey:{startsWith:"razorpay:test:"}},{idempotencyKey:{startsWith:"razorpay:order_"}}]},select:{id:true}})
    ]);
    if(needsLiveWalletReview(true,Boolean(pilotCredit),Boolean(testPayment)))throw new CheckoutError("This account has pilot test credit or test payments. Contact support for wallet review before live checkout.");
    return;
  }
  if (!pilotWalletEnabled()) return;
  const reference = "pilot-starter:" + userId;
  if (await tx.walletLedgerEntry.findUnique({ where: { reference } })) return;
  await tx.walletLedgerEntry.create({ data: { userId, direction: "CREDIT", amount: PILOT_STARTER_CREDIT, currency: "INR", reference, description: "Pilot test credit · not a cash deposit", metadata: { testCredit: true, withdrawable: false, source: "PILOT_STARTER" } } });
}
