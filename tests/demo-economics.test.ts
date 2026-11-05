import assert from"node:assert/strict";import{test}from"node:test";
import{contribution,demoTotals,demoFinance,demoOverhead,DEMO_BATCH,type DemoFinance}from"../lib/demo-economics";
const row:DemoFinance={listPrice:10000,discount:1000,collected:9000,refund:500,mother:5000,courier:2000,packaging:300,processing:200,operations:100,motherSettlement:"SIMULATED_DUE",courierSettlement:"SIMULATED_PAID"};
test("contribution subtracts refunds and costs without deducting discounts twice",()=>assert.equal(contribution(row),900));
test("fixed overhead changes scenario result, not individual order contribution",()=>{const t=demoTotals([row],1500);assert.equal(t.operatingResult,-600);assert.equal(t.contribution,900);assert.equal(t.netReceipts,8500);assert.equal(t.profitableOrders,1);});
test("refund and failed-fulfilment costs can produce a negative contribution",()=>{const r={...row,refund:9000};assert(contribution(r)<0);assert.equal(demoTotals([r],0).lossOrders,1);});
test("report does not interpret unrelated or invalid snapshots as demo money",()=>{assert.equal(demoFinance({demoFinance:row}),null);assert.equal(demoFinance({demoBatch:DEMO_BATCH,demoFinance:{...row,refund:10000}}),null);assert.equal(demoFinance({demoBatch:DEMO_BATCH,demoFinance:{...row,processing:-1}}),null);assert(demoFinance({demoBatch:DEMO_BATCH,demoFinance:row}));});
test("fixed overhead accepts bounded rupee amounts and rejects invalid input",()=>{assert.equal(demoOverhead("12.34"),1234);assert.equal(demoOverhead("-5"),50000);assert.equal(demoOverhead("no"),50000);});
