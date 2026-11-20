import {test} from "node:test";import assert from "node:assert/strict";import {repeatMenuDates} from "../lib/menu-repeat";
const now=new Date("2026-11-20T20:00:00Z");
test("seven meal dates cross week and month boundaries without skipping a day",()=>{assert.deepEqual(repeatMenuDates("2026-11-27",7,now).map(d=>d.toISOString().slice(0,10)),["2026-11-27","2026-11-28","2026-11-29","2026-11-30","2026-12-01","2026-12-02","2026-12-03"]);});
test("menu repeat rejects past India dates, invalid calendars and excessive counts",()=>{for(const [date,n]of [["2026-11-20",7],["2026-11-31",7],["2026-11-21",8],["2026-11-21",0]]as const)assert.throws(()=>repeatMenuDates(date,n,now));assert.equal(repeatMenuDates("2026-11-21",1,now).length,1);});
