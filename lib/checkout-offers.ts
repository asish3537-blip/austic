import type {Prisma} from "@/app/generated/prisma/client";
import {couponDiscount} from "@/lib/dispatch-rules";

export type CheckoutOffer={code:string;kind:string;value:number;minimumSpend:number;maximumDiscount:number;endsAt:string;firstOrderOnly:boolean;eligible:boolean;saving:number};
export function checkoutOffer(c:{code:string;kind:string;value:unknown;minimumSpend:unknown;maximumDiscount:unknown;endsAt:Date;firstOrderOnly:boolean},food:number,delivery:number):CheckoutOffer{
 const saving=food>=Number(c.minimumSpend)?couponDiscount(c.kind,Number(c.value),Number(c.maximumDiscount),food,delivery):0;
 return {code:c.code,kind:c.kind,value:Number(c.value),minimumSpend:Number(c.minimumSpend),maximumDiscount:Number(c.maximumDiscount),endsAt:c.endsAt.toISOString(),firstOrderOnly:c.firstOrderOnly,eligible:saving>0,saving};
}
export async function availableCheckoutOffers(tx:Prisma.TransactionClient,customerId:string,food:number,delivery:number){
 const now=new Date();
 const coupons=await tx.coupon.findMany({where:{isActive:true,startsAt:{lte:now},endsAt:{gt:now},kind:{in:["FIXED","PERCENT","DELIVERY"]}},orderBy:[{endsAt:"asc"},{code:"asc"}],take:50});
 if(!coupons.length)return [];
 const ids=coupons.map(c=>c.id);
 const [total,personal,orders]=await Promise.all([
  tx.couponRedemption.groupBy({by:["couponId"],where:{couponId:{in:ids}},_count:{_all:true}}),
  tx.couponRedemption.groupBy({by:["couponId"],where:{couponId:{in:ids},customerId},_count:{_all:true}}),
  tx.order.count({where:{customerId,status:{notIn:["CANCELLED","FAILED"]}}})
 ]);
 const all=new Map(total.map(r=>[r.couponId,r._count._all])),mine=new Map(personal.map(r=>[r.couponId,r._count._all]));
 return coupons.filter(c=>(all.get(c.id)??0)<c.usageLimit&&(mine.get(c.id)??0)<c.perCustomerLimit&&(!c.firstOrderOnly||orders===0)).map(c=>checkoutOffer(c,food,delivery));
}
