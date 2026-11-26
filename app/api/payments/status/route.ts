import {NextResponse} from "next/server";
import {razorpayConfig} from "@/lib/razorpay";
import {razorpayMode} from "@/lib/razorpay-order-reference";
export const dynamic="force-dynamic";
export const runtime="nodejs";
/** Public checkout mode only: no keys, account details or provider requests. */
export async function GET(){
 const config=razorpayConfig();
 const ready=Boolean(config&&process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
 return NextResponse.json({provider:"razorpay",mode:ready?razorpayMode(config!.id):"unavailable",currency:"INR",verification:"configuration-only"},{headers:{"Cache-Control":"no-store"}});
}
