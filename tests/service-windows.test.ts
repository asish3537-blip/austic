import assert from 'node:assert/strict';import {test} from 'node:test';import {slotAllowed,componentsAllowed,indiaDate,indiaMinutes,validProductSlot,canStartLocalDelivery,nextProductDelivery} from '../lib/service-windows';
test('meal period boundaries and 21:00 dinner cutoff',()=>{assert(slotAllowed('BREAKFAST','06:00'));assert(slotAllowed('BREAKFAST','10:59'));assert(!slotAllowed('BREAKFAST','11:00'));assert(slotAllowed('LUNCH','11:00'));assert(!slotAllowed('LUNCH','17:00'));assert(slotAllowed('DINNER','21:00'));assert(!slotAllowed('DINNER','21:01'));assert(!slotAllowed('DINNER','25:00'));});
test('description-based meals do not require component fields',()=>{assert(componentsAllowed('LUNCH',[]));assert(componentsAllowed('LUNCH',['Rice']));assert(componentsAllowed('BREAKFAST',['Sattu']));assert(componentsAllowed('DINNER',[]));assert(!componentsAllowed('INVALID',[]));assert(!componentsAllowed('LUNCH',['A','B','C','D']));});
test('India date rollover and pickup closing time',()=>{assert.equal(indiaDate(new Date('2026-11-06T19:00:00Z')),'2026-11-07');assert.equal(indiaMinutes(new Date('2026-11-06T15:30:00Z')),1260);assert(canStartLocalDelivery(new Date('2026-11-06T14:59:00Z')));assert(!canStartLocalDelivery(new Date('2026-11-06T15:00:00Z')));});
test('product preparation, travel buffer, seven-day horizon and closing time',()=>{const now=new Date('2026-11-06T03:30:00Z');assert(validProductSlot(new Date('2026-11-06T05:00:00Z'),60,now));assert(!validProductSlot(new Date('2026-11-06T04:59:00Z'),60,now));assert(!validProductSlot(new Date('2026-11-06T15:31:00Z'),0,now));assert(!validProductSlot(new Date('2026-11-14T05:00:00Z'),0,now));});

test('optional product time suggests a valid slot, moves past closing and respects expiry',()=>{
 const now=new Date('2026-11-20T03:30:00Z');
 const slot=nextProductDelivery(60,null,now);assert(slot);assert(validProductSlot(slot,60,now));assert.equal(slot.toISOString(),'2026-11-20T05:15:00.000Z');
 const late=new Date('2026-11-20T15:00:00Z');const morning=nextProductDelivery(0,null,late);assert(morning);assert.equal(indiaMinutes(morning),360);assert.equal(indiaDate(morning),'2026-11-21');
 assert.equal(nextProductDelivery(60,new Date('2026-11-20T04:00:00Z'),now),null);
});
