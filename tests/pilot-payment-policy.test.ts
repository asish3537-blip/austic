import test from "node:test";
import assert from "node:assert/strict";
import {pilotPaymentReady,pilotTransition,validPilotKey} from "../lib/pilot-payment-policy";
import {PILOT_KITCHENS,pilotMenus} from "../lib/pilot-catalog";
test("sample checkout accepts only a complete Test configuration",()=>{
 assert.equal(pilotPaymentReady("rzp_test_Practice","fixture-secret","fixture-webhook"),true);
 assert.equal(pilotPaymentReady("rzp_live_Practice","fixture-secret","fixture-webhook"),false);
 assert.equal(pilotPaymentReady("rzp_test_Practice","fixture-secret",undefined),false);
 assert.equal(pilotPaymentReady(undefined,"fixture-secret","fixture-webhook"),false);
 assert.equal(validPilotKey("rzp_test_"),false);
});
test("pilot preparation and handover cannot skip payment, sequence or role",()=>{
 assert.equal(pilotTransition("mother","ORDER_PLACED","CONFIRMED",false),false);
 assert.equal(pilotTransition("mother","ORDER_PLACED","CONFIRMED",true),true);
 assert.equal(pilotTransition("courier","ORDER_PLACED","CONFIRMED",true),false);
 assert.equal(pilotTransition("mother","CONFIRMED","READY_FOR_PICKUP",true),false);
 assert.equal(pilotTransition("courier","READY_FOR_PICKUP","DELIVERY_ASSIGNED",true),true);
 assert.equal(pilotTransition("courier","DELIVERY_ASSIGNED","DELIVERED",true),false);
 assert.equal(pilotTransition("customer","OUT_FOR_DELIVERY","CANCELLED",true),false);
});
test("ten fictional kitchens and menu overrides keep their own identifiers",()=>{
 assert.equal(PILOT_KITCHENS.length,10);assert.equal(new Set(PILOT_KITCHENS.map(k=>k.id)).size,10);
 assert(PILOT_KITCHENS.every(k=>k.id.startsWith("pilot-")&&k.name.includes("Practice")&&k.meals.some(m=>m.oneTimeOnly)));
 const first=PILOT_KITCHENS[0],changed={...first.meals[0],name:"My saved practice dish"};
 const catalog=pilotMenus({[first.id]:[changed]});assert.equal(catalog[0].meals[0].name,changed.name);
 assert.equal(PILOT_KITCHENS[0].meals[0].name,first.meals[0].name);assert.equal(catalog[1].meals.length,2);
});
