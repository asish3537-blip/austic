import { test } from "node:test";
import assert from "node:assert/strict";
import { validRazorpaySignature } from "../lib/razorpay-signature";
// Standard HMAC-SHA256 fixture: no real payment credentials or transaction.
const signature="f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";
test("valid payment signature matches the independently published HMAC fixture",()=>{assert.equal(validRazorpaySignature("The quick brown fox jumps over the lazy dog",signature,"key"),true);});
test("changed payload, wrong secret and malformed signatures fail closed",()=>{
 assert.equal(validRazorpaySignature("Changed amount",signature,"key"),false);
 assert.equal(validRazorpaySignature("The quick brown fox jumps over the lazy dog",signature,"wrong"),false);
 for(const invalid of ["",signature.slice(1),"z".repeat(64),signature+"00"]){assert.equal(validRazorpaySignature("message",invalid,"key"),false);}
});
