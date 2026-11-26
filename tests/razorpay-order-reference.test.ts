import {test} from "node:test";
import assert from "node:assert/strict";
import {razorpayMode,razorpayOrderReference,readRazorpayOrderReference} from "../lib/razorpay-order-reference";
test("provider orders cannot be reused across Test and Live modes",()=>{
 for(const mode of ["test","live"] as const){
  const reference=razorpayOrderReference(mode,"order_ABC123");
  assert.equal(readRazorpayOrderReference(reference,mode),"order_ABC123");
  assert.equal(readRazorpayOrderReference(reference,mode==="test"?"live":"test"),null);
 }
});
test("legacy test references stay test-only and malformed references fail closed",()=>{
 assert.equal(readRazorpayOrderReference("razorpay:order_ABC123","test"),"order_ABC123");
 assert.equal(readRazorpayOrderReference("razorpay:order_ABC123","live"),null);
 for(const value of [null,"","razorpay:live:order_ABC/123","razorpay:live:pay_ABC","other:live:order_ABC"])
  assert.equal(readRazorpayOrderReference(value,"live"),null);
 assert.equal(razorpayMode("rzp_live_FAKE"),"live");
 assert.equal(razorpayMode("rzp_test_FAKE"),"test");
 assert.throws(()=>razorpayMode("invalid"));
 assert.throws(()=>razorpayOrderReference("live","pay_ABC123"));
});
