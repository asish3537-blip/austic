import { test } from "node:test";
import assert from "node:assert/strict";
import { translated } from "../lib/ui-translations";
const actions=["Active orders","Incoming orders","Accept order","Start cooking","Ready for courier","Assigned deliveries","Accept delivery","Head to pickup","Kitchen pickup OTP","Your delivery OTP","Product requests & agreed times","Accept requested time","Save product","Pay securely","Balance due","Payment methods"];
test("main order, kitchen, courier and payment actions are translated in Hindi and Odia",()=>{
 for(const text of actions){assert.match(translated(text,"hi"),/[\u0900-\u097f]/,text);assert.match(translated(text,"or"),/[\u0b00-\u0b7f]/,text);}
});
test("API-style status codes use the same translations as visible status labels",()=>{
 for(const status of ["READY_FOR_PICKUP","OUT_FOR_DELIVERY","DELIVERY_ASSIGNED","GOING_TO_PICKUP"]){assert.notEqual(translated(status,"or"),status);assert.notEqual(translated(status,"hi"),status);}
});
test("English and kitchen-authored product names are preserved",()=>{
 assert.equal(translated("Accept order","en"),"Accept order");assert.equal(translated("Sonali’s mango pickle","or"),"Sonali’s mango pickle");
});
