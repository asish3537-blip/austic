import {test} from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import {availableCheckoutOffers,checkoutOffer} from "../lib/checkout-offers";
import {AvailableCheckoutOffers,type CheckoutQuote} from "../components/checkout-review";
import {pilotCheckoutPrice} from "../lib/pilot-checkout-price";
import {PilotCoupons} from "../components/pilot-coupons";
import {checkoutOfferCopy} from "../lib/checkout-offer-copy";
import {translated} from "../lib/ui-translations";
const coupon={code:"FOOD10",kind:"PERCENT",value:10,minimumSpend:100,maximumDiscount:30,endsAt:new Date("2027-01-01T00:00:00Z"),firstOrderOnly:false};
test("offer savings obey minimum spend, caps and delivery fees",()=>{
 assert.equal(checkoutOffer(coupon,400,20).saving,30);
 assert.equal(checkoutOffer(coupon,90,20).eligible,false);
 assert.equal(checkoutOffer({...coupon,kind:"DELIVERY",value:100},200,0).eligible,false);
 assert.equal(checkoutOffer({...coupon,kind:"DELIVERY",value:100},200,20).saving,20);
});
test("available list omits exhausted, personally used and first-order-only codes",async()=>{
 const rows=[{...coupon,id:"good",usageLimit:10,perCustomerLimit:1},{...coupon,id:"used",code:"USED",usageLimit:10,perCustomerLimit:1},{...coupon,id:"full",code:"FULL",usageLimit:2,perCustomerLimit:1},{...coupon,id:"first",code:"FIRST",firstOrderOnly:true,usageLimit:10,perCustomerLimit:1}];
 let queries=0;
 const tx={coupon:{findMany:async(args:unknown)=>{assert(JSON.stringify(args).includes('"isActive":true'));return rows;}},couponRedemption:{groupBy:async(args:{where:{customerId?:string}})=>{queries++;return args.where.customerId?[{couponId:"used",_count:{_all:1}}]:[{couponId:"full",_count:{_all:2}}];}},order:{count:async()=>1}};
 const list=await availableCheckoutOffers(tx as never,"customer",200,20);assert.equal(queries,2);assert.deepEqual(list.map(c=>c.code),["FOOD10"]);
});
const quote={subtotal:200,deliveryFee:0,discount:0,total:200,walletApplied:0,amountDue:200,couponCode:"",offers:[checkoutOffer(coupon,200,0)],feeRule:{firstDeliveryFree:true}} as CheckoutQuote;
test("checkout presents selectable coupons, savings, terms and honest payment offers",()=>{
 const html=renderToStaticMarkup(<AvailableCheckoutOffers quote={quote} onUse={()=>{}}/>);
 for(const text of ['Available coupons','FOOD10','Use coupon','Minimum food spend','Valid until','First delivery free','No payment-method cashback'])assert(html.includes(text));
 assert(!html.includes('Guaranteed cashback'));
});
test("empty coupons and zero external balance have explicit explanations",()=>{
 const html=renderToStaticMarkup(<AvailableCheckoutOffers quote={{...quote,offers:[],amountDue:0}} onUse={()=>{}}/>);
 assert(html.includes('No additional coupons'));assert(html.includes('No external payment is due'));
});
test("practice coupons have bounded Test-only totals and reject unknown codes",()=>{
 assert.equal(pilotCheckoutPrice(69,1,1).totalPaise,7800);
 assert.equal(pilotCheckoutPrice(69,1,1,' test10 ').totalPaise,7110);
 assert.equal(pilotCheckoutPrice(69,1,3,'TESTDELIVERY').totalPaise,20700);
 assert.equal(pilotCheckoutPrice(1000,3,7,'TEST10').discountPaise,10000);
 assert.throws(()=>pilotCheckoutPrice(69,1,1,'FREE'),/unavailable/);
});
test("practice coupon controls are labelled Test-only and all offer copy is translated",()=>{
 const html=renderToStaticMarkup(<PilotCoupons code="TEST10" onChange={()=>{}} price={69} quantity={1} days={1} disabled={false}/>);
 assert(html.includes('TESTDELIVERY'));assert(html.includes('Test-only offers'));assert(html.includes('No real cashback'));
 for(const key of Object.keys(checkoutOfferCopy))for(const language of ['hi','or'] as const)assert.notEqual(translated(key,language),key);
});
