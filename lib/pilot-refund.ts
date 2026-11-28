type RefundOrder={id:string;providerOrderId:string;providerPaymentId:string;amountPaise:number};
type Gateway=(path:string,data?:unknown,idempotencyKey?:string)=>Promise<Record<string,unknown>>;
type Refund={id:string;payment_id:string;amount:number;currency:string;status:string;receipt?:string};

export function pilotRefundKey(orderId:string){return "paustik-pilot-refund-"+orderId;}
export function verifiedPilotRefund(value:unknown,order:RefundOrder){
 const r=value as Refund;
 if(!r||!/^rfnd_[A-Za-z0-9]+$/.test(r.id)||r.payment_id!==order.providerPaymentId||r.amount!==order.amountPaise||r.currency!=="INR"||!["processed","pending"].includes(r.status))throw Error("Test refund could not be verified. Check again or contact support.");
 return {refundId:r.id,refunded:r.status==="processed",refundPending:r.status==="pending"};
}
// The same full-amount request and provider idempotency key survive lost responses.
// The caller must serialize operations for this order and enforce ownership/Test keys.
export async function requestPilotRefund(order:RefundOrder,gateway:Gateway){
 const path="payments/"+encodeURIComponent(order.providerPaymentId);
 const p=await gateway(path);
 if(p.id!==order.providerPaymentId||p.order_id!==order.providerOrderId||p.amount!==order.amountPaise||p.currency!=="INR"||!["captured","refunded"].includes(String(p.status)))throw Error("Test payment details do not match the refund.");
 const list=await gateway(path+"/refunds?count=100");
 const existing=(Array.isArray(list.items)?list.items:[]).find((r:Refund)=>r.receipt===order.id);
 if(existing)return verifiedPilotRefund(existing,order);
 if(Number(p.amount_refunded||0)>0)throw Error("This Test payment has another refund. Contact support before retrying.");
 return verifiedPilotRefund(await gateway(path+"/refund",{amount:order.amountPaise,speed:"normal",receipt:order.id,notes:{purpose:"paustik_pilot_test_only"}},pilotRefundKey(order.id)),order);
}
