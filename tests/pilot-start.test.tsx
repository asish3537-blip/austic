import {test} from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import PilotStart from "../app/pilot/start/page";
import {translated} from "../lib/ui-translations";
import {pilotStartCopy} from "../lib/pilot-start-copy";

test("personal-account pilot setup links sign-in, private practice and a separate Test APK",()=>{
 const html=renderToStaticMarkup(<PilotStart/>);
 for(const href of ["/sign-up","/sign-in","/pilot","/downloads/Paustik-1.4.2-test6.apk"])assert(html.includes('href="'+href+'"'),href);
 assert(html.includes("Live payments and real order changes are blocked"));
 assert(html.includes("Never enter real card or bank details"));
 assert(!html.includes("rzp_live_"));
});
test("new tester guidance and packing label have Hindi and Odia translations",()=>{
 for(const key of Object.keys(pilotStartCopy))for(const language of ["hi","or"] as const)assert.notEqual(translated(key,language),key,key+" "+language);
});
