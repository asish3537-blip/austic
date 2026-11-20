import {test} from "node:test";
import assert from "node:assert/strict";
import {fssaiEvidenceExpiry} from "../lib/kitchen-license";
const licenseNumber="12345678901234";
test("FSSAI evidence needs a number and an explicit certificate validity choice",()=>{
 assert.throws(()=>fssaiEvidenceExpiry({licenseNumber}));
 assert.throws(()=>fssaiEvidenceExpiry({licenseNumber:"123",perpetual:true}));
 assert.throws(()=>fssaiEvidenceExpiry({licenseNumber,validUntil:"2026-02-30"}));
 assert.throws(()=>fssaiEvidenceExpiry({licenseNumber,validUntil:"2027-01-01",perpetual:true}));
});
test("perpetual certificates need no invented expiry; dated certificates cover the last India calendar day",()=>{
 assert.equal(fssaiEvidenceExpiry({licenseNumber,perpetual:true}),null);
 assert.equal(fssaiEvidenceExpiry({licenseNumber,validUntil:"2027-01-01"})?.toISOString(),"2027-01-01T18:29:59.999Z");
});
