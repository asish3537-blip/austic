import {test} from "node:test";
import assert from "node:assert/strict";
import {orderSupportMessage,repeatMealLink} from "../lib/order-actions";
test("repeat orders navigate to current menu review without old prices or quantities",()=>{
 const url=new URL(repeatMealLink("kitchen/id","Dal & rice"),"https://paustik.in");
 assert.equal(url.pathname,"/customer/kitchens/kitchen%2Fid");assert.equal(url.searchParams.get("q"),"Dal & rice");assert.equal(url.hash,"#kitchen-menu");assert.equal(url.searchParams.has("price"),false);assert.equal(url.searchParams.has("quantity"),false);
});
test("order support includes the reference and no customer contact information",()=>{
 assert.equal(orderSupportMessage("PS-123"),"Hi Paustik, I need help with order PS-123. Please help me with: ");assert(!orderSupportMessage("PS-123\nBcc: other").includes("\n"));
});
