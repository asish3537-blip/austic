import {test} from "node:test";
import assert from "node:assert/strict";
import {orderTimeline} from "../lib/order-timeline";
test("current status does not invent timestamps for skipped updates",()=>{
 const steps=orderTimeline("OUT_FOR_DELIVERY",[{status:"ORDER_PLACED",at:"2026-11-28T10:00:00Z"}]);
 assert.equal(steps[5].state,"current");assert.equal(steps[2].state,"passed");assert.equal(steps[2].at,undefined);assert.equal(steps[6].state,"upcoming");
});
test("cancelled orders do not mark unobserved preparation as complete",()=>{
 const steps=orderTimeline("CANCELLED",[{status:"CONFIRMED",at:"2026-11-28T10:00:00Z"}]);
 assert.equal(steps[1].state,"recorded");assert.equal(steps[2].state,"stopped");assert(steps.every(s=>s.state!=="current"));
});
test("courier assignment maps to ready and photo stages stay in the right steps",()=>{
 const steps=orderTimeline("DELIVERY_ASSIGNED",[{status:"PREPARING",at:"invalid"}]);
 assert.equal(steps[3].state,"current");assert.equal(steps[2].at,undefined);assert.equal(steps[2].photo,"PREPARED");assert.equal(steps[3].photo,"HANDOVER");
});
