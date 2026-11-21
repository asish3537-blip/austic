import {test} from "node:test";
import assert from "node:assert/strict";
import {canDeclineDeliveryOffer} from "../lib/delivery-offer-response";
const offer={orderStatus:"READY_FOR_PICKUP",deliveryStatus:"ASSIGNED",agentId:null,bulk:false,offeredHere:true};
test("ready and scheduled offers may be declined only before acceptance",()=>{
 assert.equal(canDeclineDeliveryOffer(offer,"a"),true);
 assert.equal(canDeclineDeliveryOffer({...offer,agentId:"a"},"a"),true);
 for(const status of ["ORDER_PLACED","CONFIRMED","PREPARING"])assert.equal(canDeclineDeliveryOffer({...offer,orderStatus:status,deliveryStatus:null},"a"),true);
 for(const deliveryStatus of ["ACCEPTED","GOING_TO_PICKUP","PICKED_UP","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"])assert.equal(canDeclineDeliveryOffer({...offer,deliveryStatus},"a"),false);
});
test("decline rejects another courier, out-of-area, bulk and closed orders",()=>{
 for(const change of [{agentId:"b"},{offeredHere:false},{bulk:true},{orderStatus:"CANCELLED"},{orderStatus:"DELIVERY_ASSIGNED"},{orderStatus:"DELIVERED"}])assert.equal(canDeclineDeliveryOffer({...offer,...change},"a"),false);
 assert.deepEqual(offer,{orderStatus:"READY_FOR_PICKUP",deliveryStatus:"ASSIGNED",agentId:null,bulk:false,offeredHere:true});
});
