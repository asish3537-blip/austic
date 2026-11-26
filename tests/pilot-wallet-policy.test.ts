import {test} from "node:test";
import assert from "node:assert/strict";
import {allowPilotCredit,needsLiveWalletReview} from "../lib/pilot-wallet-policy";
test("Live keys disable starter credits even when a stale pilot flag remains enabled",()=>{
 assert.equal(allowPilotCredit("true","rzp_live_FAKE"),false);
 assert.equal(allowPilotCredit("true","rzp_test_FAKE"),true);
 assert.equal(allowPilotCredit("false","rzp_test_FAKE"),false);
 assert.equal(allowPilotCredit(undefined,undefined),false);
});
test("Live checkout holds test-funded accounts for review while clean accounts can proceed",()=>{
 assert.equal(needsLiveWalletReview(true,true,false),true);
 assert.equal(needsLiveWalletReview(true,false,true),true);
 assert.equal(needsLiveWalletReview(true,false,false),false);
 assert.equal(needsLiveWalletReview(false,true,true),false);
});
