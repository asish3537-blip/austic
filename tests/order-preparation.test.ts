import {test} from "node:test";
import assert from "node:assert/strict";
import {paymentBlocksPreparation} from "../lib/order-preparation";
test("unpaid or reversed orders cannot enter cooking or pickup readiness",()=>{
 for(const payment of ["PENDING","FAILED","REFUNDED","PARTIALLY_REFUNDED"])
  for(const next of ["PREPARING","READY_FOR_PICKUP"])
   assert.equal(paymentBlocksPreparation(next,payment),true);
});
test("captured payments permit preparation while confirmation and cancellation keep their own rules",()=>{
 assert.equal(paymentBlocksPreparation("PREPARING","CAPTURED"),false);
 assert.equal(paymentBlocksPreparation("READY_FOR_PICKUP","CAPTURED"),false);
 assert.equal(paymentBlocksPreparation("CONFIRMED","PENDING"),false);
 assert.equal(paymentBlocksPreparation("CANCELLED","PENDING"),false);
});
