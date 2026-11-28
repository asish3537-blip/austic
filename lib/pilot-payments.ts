import {prisma} from "@/lib/prisma";
import {pilotPaymentReady} from "@/lib/pilot-payment-policy";
import {validRazorpaySignature} from "@/lib/razorpay-signature";
import {requestPilotRefund} from "@/lib/pilot-refund";
export {validRazorpaySignature};

export function pilotRazorpayConfig(){
 const id=process.env.RAZORPAY_PILOT_KEY_ID?.trim(),secret=process.env.RAZORPAY_PILOT_KEY_SECRET?.trim(),webhook=process.env.RAZORPAY_PILOT_WEBHOOK_SECRET?.trim();
 return pilotPaymentReady(id,secret,webhook)?{id:id!,secret:secret!,webhook:webhook!}:null;
}
export async function pilotGateway(path:string,data?:unknown,idempotencyKey?:string){
 const c=pilotRazorpayConfig();if(!c)throw Error("Pilot Test checkout is not configured. Live keys are never used for sample orders.");
 const r=await fetch("https://api.razorpay.com/v1/"+path,{method:data?"POST":"GET",headers:{Authorization:"Basic "+Buffer.from(c.id+":"+c.secret).toString("base64"),"Content-Type":"application/json",...(idempotencyKey?{"X-Refund-Idempotency":idempotencyKey}:{})},...(data?{body:JSON.stringify(data)}:{}),cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("Razorpay Test checkout is temporarily unavailable.");return r.json();
}
export async function capturePilotReceipt(providerOrderId:string,paymentId:string){
 const local=await prisma.pilotOrder.findUnique({where:{providerOrderId}});if(!local)throw Error("Unknown pilot payment.");
 const remote=await pilotGateway("payments/"+encodeURIComponent(paymentId));
 if(remote.id!==paymentId||remote.order_id!==providerOrderId||remote.currency!=="INR"||remote.amount!==local.amountPaise)throw Error("Pilot payment details do not match.");
 if(remote.status!=="captured"||remote.captured!==true)return{paid:false};
 const result=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-order:"+local.id},0))`;
  const current=await tx.pilotOrder.findUniqueOrThrow({where:{id:local.id}});
  if(["CAPTURED","REFUND_PENDING","REFUNDED"].includes(current.paymentStatus)){if(current.providerPaymentId!==paymentId)throw Error("Pilot payment already recorded.");return{paid:true,cancelled:current.status==="CANCELLED"};}
  const events=Array.isArray(current.events)?current.events:[];
  await tx.pilotOrder.update({where:{id:local.id},data:{paymentStatus:"CAPTURED",providerPaymentId:paymentId,status:current.status==="PAYMENT_PENDING"?"ORDER_PLACED":current.status,events:[...events,{status:"ORDER_PLACED",detail:"Razorpay Test payment verified. No real money or food delivery.",at:new Date().toISOString()}]}});
  return{paid:true,cancelled:current.status==="CANCELLED"};
 });
 if(result.cancelled)return {...result,...await refundPilotOrder(local.id,local.workspaceId)};
 return result;
}

export async function refundPilotOrder(orderId:string,workspaceId:string){
 if(!pilotRazorpayConfig())throw Error("Test refunds require the dedicated Razorpay Test configuration.");
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-order:"+orderId},0))`;
  const order=await tx.pilotOrder.findFirst({where:{id:orderId,workspaceId}});
  if(!order||order.status!=="CANCELLED"||!order.providerOrderId||!order.providerPaymentId||!["CAPTURED","REFUND_PENDING","REFUNDED"].includes(order.paymentStatus))throw Error("Cancel an eligible paid practice order before requesting a Test refund.");
  if(order.paymentStatus==="REFUNDED")return{refunded:true,refundPending:false};
  const result=await requestPilotRefund({...order,providerOrderId:order.providerOrderId,providerPaymentId:order.providerPaymentId},pilotGateway);
  const status=result.refunded?"REFUNDED":"REFUND_PENDING",events=Array.isArray(order.events)?order.events:[];
  await tx.pilotOrder.update({where:{id:order.id},data:{paymentStatus:status,events:order.paymentStatus===status?events:[...events,{status,detail:"Razorpay Test refund "+result.refundId+". No real money movement.",at:new Date().toISOString()}]}});
  return result;
 },{timeout:35000});
}
