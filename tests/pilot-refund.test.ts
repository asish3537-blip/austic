import test from "node:test";
import assert from "node:assert/strict";
import {pilotRefundKey,requestPilotRefund,verifiedPilotRefund} from "../lib/pilot-refund";
const order={id:"a45b1234-1234-4234-8234-123456789012",providerOrderId:"order_Test",providerPaymentId:"pay_Test",amountPaise:7800};
const payment={id:order.providerPaymentId,order_id:order.providerOrderId,amount:7800,currency:"INR",status:"captured",amount_refunded:0};
const refund={id:"rfnd_Test",payment_id:order.providerPaymentId,amount:7800,currency:"INR",status:"processed",receipt:order.id};
test("refund response must match payment, amount, currency and a valid status",()=>{
 assert.equal(verifiedPilotRefund(refund,order).refunded,true);
 assert.equal(verifiedPilotRefund({...refund,status:"pending"},order).refunded,false);
 for(const change of [{amount:1},{currency:"USD"},{payment_id:"pay_Other"},{status:"failed"},{id:"fake"}])assert.throws(()=>verifiedPilotRefund({...refund,...change},order));
});
test("a lost refund response can retry using the identical provider idempotency key/body",async()=>{
 const posts:{body:unknown;key?:string}[]=[];
 const gateway=async(path:string,body?:unknown,key?:string)=>{
  if(!body)return path.includes("refunds?")?{items:[]}:payment;
  posts.push({body,key});if(posts.length===1)throw Error("lost response");return refund;
 };
 await assert.rejects(requestPilotRefund(order,gateway),/lost response/);
 assert.equal((await requestPilotRefund(order,gateway)).refunded,true);
 assert.deepEqual(posts[0],posts[1]);assert.equal(posts[0].key,pilotRefundKey(order.id));
});
test("checking a pending or processed refund never posts a second refund",async()=>{
 for(const status of ["pending","processed"]){let posts=0;const result=await requestPilotRefund(order,async(path,body)=>{if(body){posts++;throw Error("duplicate");}return path.includes("refunds?")?{items:[{...refund,status}]}:payment;});assert.equal(posts,0);assert.equal(result.refunded,status==="processed");}
});
test("wrong payment and unrelated partial refunds cannot start a refund",async()=>{
 for(const change of [{order_id:"order_Other"},{amount:1},{currency:"USD"},{status:"authorized"},{amount_refunded:100}]){let posts=0;await assert.rejects(requestPilotRefund(order,async(path,body)=>{if(body)posts++;return path.includes("refunds?")?{items:[]}:{...payment,...change};}));assert.equal(posts,0);}
});
