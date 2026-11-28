import {test} from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import {createRequire} from "node:module";
// Use the CJS loader so Next Image is unwrapped as in the Next bundler.
const require=createRequire(import.meta.url);
const {require:tsxRequire}=require("tsx/cjs/api");
const {AppFeatureShowcase}=tsxRequire("../components/app-feature-showcase.tsx",import.meta.url);
test("all six feature controls belong to the dual-screen preview",()=>{
 const html=renderToStaticMarkup(<AppFeatureShowcase/>);
 const start=html.indexOf('class="duo-device"');
 assert(start>0);
 const device=html.slice(start);
 assert.equal((device.match(/aria-controls="duo-preview-content"/g)||[]).length,6);
 for(const label of ["Meal Plans","Order a Meal","Mother Kitchens","Homemade Foods","Offers &amp; wallet","Order tracking"])assert(device.includes(label),label);
 assert(!html.includes('class="feature-side"'));
 assert(device.includes('href="/app"'));
 assert(device.includes("Preview only."));
 assert(device.includes("home-find-meal-v2.webp"));
});
