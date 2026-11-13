import {test} from "node:test";import assert from "node:assert/strict";
import {isSchoolRoute} from "../lib/service-brand";
test("school landing, booking and reception pages share ScooFoo branding",()=>{for(const path of ["/scoofoo","/school-tiffins","/school-desk","/school-tiffins/example"])assert.equal(isSchoolRoute(path),true);});
test("Paustik pages and similarly named unrelated routes keep their own brand",()=>{for(const path of ["/","/customer/dashboard","/mother/dashboard","/delivery/dashboard","/school-tiffins-extra"])assert.equal(isSchoolRoute(path),false);});
