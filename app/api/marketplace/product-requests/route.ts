import {NextResponse} from "next/server";
import {z} from "zod";
import {randomUUID} from "node:crypto";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {productInclude,productTerms,productRequests,availableProduct,assertProductSlot,assertProductArea,MarketError} from "@/lib/food-marketplace";
import {DELIVERY_FEE_INR,lockWallet,walletBalance,CANCELLATION_CUTOFF_HOURS,CANCELLATION_OPERATION_FEE_INR} from "@/lib/marketplace-rules";
import {DELIVERY_WINDOW_POLICY} from "@/lib/service-windows";
import {ensurePilotWallet} from "@/lib/pilot-wallet";
import {scheduleEntityPush} from "@/lib/web-push";
import {scheduleCourierOffers} from "@/lib/courier-offers";
import type {Prisma} from "@/app/generated/prisma/client";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("create"),productId:z.string().uuid(),quantity:z.number().int().min(1).max(100),scheduledFor:z.iso.datetime()}),
 z.object({action:z.enum(["offer","counter"]),requestId:z.string().uuid(),version:z.number().int().min(0),scheduledFor:z.iso.datetime()}),
 z.object({action:z.enum(["accept","confirm","cancel","decline"]),requestId:z.string().uuid(),version:z.number().int().min(0)})
]);
export async function GET(){const u=await getCurrentUser();if(!u||u.status!=="ACTIVE"||!["CUSTOMER","MOTHER","ADMIN"].includes(u.role))return NextResponse.json({error:"Sign in to view requests."},{status:403});return NextResponse.json({requests:await productRequests(u)},{headers:{"Cache-Control":"private, no-store"}});}
export async function POST(req:Request){const origin=rejectCrossOrigin(req);if(origin)return origin;const u=await getCurrentUser();if(!u||u.status!=="ACTIVE"||!["CUSTOMER","MOTHER"].includes(u.role))return NextResponse.json({error:"Customer or mother access required."},{status:403});const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Choose a request, quantity and valid delivery time."},{status:400});const x=parsed.data;try{
 if(x.action==="create"){
  if(u.role!=="CUSTOMER")throw new MarketError("Only customers can request products.",403);
  const p=await prisma.foodProduct.findUnique({where:{id:x.productId},include:productInclude});if(!p||!availableProduct(p))throw new MarketError("This product is unavailable.");if(x.quantity<p.minimumQuantity||x.quantity>p.stockCount)throw new MarketError("Choose a quantity between the minimum and remaining units.");
  const a=await prisma.address.findFirst({where:{userId:u.id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}]});if(!a)throw new MarketError("Add your delivery address first.");assertProductArea(p,a);const at=new Date(x.scheduledFor);assertProductSlot(p,at);
  const r=await prisma.$transaction(async tx=>{await lockWallet(tx,u.id);if(await tx.productRequest.count({where:{customerId:u.id,status:{in:["KITCHEN_REVIEW","CUSTOMER_CONFIRM"]},expiresAt:{gt:new Date()}}})>=20)throw new MarketError("Finish or cancel earlier requests before adding more.");const result=await tx.productRequest.create({data:{customerId:u.id,productId:p.id,addressId:a.id,quantity:x.quantity,scheduledFor:at,expiresAt:new Date(Date.now()+48*3600000),unitPrice:p.meal.price,deliveryFee:DELIVERY_FEE_INR,snapshot:{terms:productTerms(p),name:p.meal.name,unit:p.unitLabel,mode:p.preparationMode,ingredients:p.meal.ingredients,allergens:p.meal.allergens,storage:p.storageInstructions,shelfLifeHours:p.shelfLifeHours,readyUntil:p.readyUntil?.toISOString()??null},history:[{role:"CUSTOMER",action:"REQUEST",at:new Date().toISOString(),deliveryAt:at.toISOString()}]}});await tx.notification.create({data:{userId:p.meal.kitchen.mother.userId,title:"Product delivery time requested",body:p.meal.name+" · "+x.quantity+" unit(s). Review it in Mother Marketplace.",kind:"ORDER",entityId:result.id}});return result;});scheduleEntityPush([r.id]);return NextResponse.json({id:r.id,message:"Request sent. The mother must confirm readiness/time. Nothing is reserved or charged yet."},{status:201});
 }
 const result=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"product-request:"+x.requestId},0))`;
  const r=await tx.productRequest.findUnique({where:{id:x.requestId},include:{product:{include:productInclude},address:true,customer:{select:{status:true}}}});if(!r)throw new MarketError("Request not found.",404);const motherId=r.product.meal.kitchen.mother.userId,customer=u.role==="CUSTOMER"&&r.customerId===u.id,mother=u.role==="MOTHER"&&motherId===u.id;if(!customer&&!mother)throw new MarketError("Request not found.",404);
  if(x.action==="confirm"&&customer&&r.orderId)return {id:r.id,orderId:r.orderId,message:"This request already has an order. No second charge was made."};
  if(r.version!==x.version)throw new MarketError("This request changed. Refresh before responding.");if(!["KITCHEN_REVIEW","CUSTOMER_CONFIRM"].includes(r.status))throw new MarketError("This request is already closed.");if(r.expiresAt<=new Date())throw new MarketError("This offer expired. Start a new request.");if(r.customer.status!=="ACTIVE")throw new MarketError("This customer account is unavailable.");
  const log=Array.isArray(r.history)?r.history:[];if(log.length>=12&&!["cancel","decline","confirm"].includes(x.action))throw new MarketError("The time-change limit is reached. Cancel and start a new request.");
  let status=r.status,time=r.scheduledFor,expires=r.expiresAt;
  if(x.action==="cancel"){if(!customer)throw new MarketError("Only the customer can cancel a request.",403);status="CANCELLED";}
  else if(x.action==="decline"){if(!mother)throw new MarketError("Only the kitchen can decline.",403);status="DECLINED";}
  else{
   if((r.snapshot as Record<string,string>).terms!==productTerms(r.product))throw new MarketError("Product ingredients, price or terms changed. Start a new request to review them.");
   if(!availableProduct(r.product)||r.quantity>r.product.stockCount||r.quantity<r.product.minimumQuantity)throw new MarketError("Product availability changed. Ask the kitchen for a new request.");assertProductArea(r.product,r.address);
   if(x.action==="offer"||x.action==="accept"){if(!mother||r.status!=="KITCHEN_REVIEW")throw new MarketError("The kitchen can respond when a customer proposal is awaiting review.");if(x.action==="offer")time=new Date(x.scheduledFor);status="CUSTOMER_CONFIRM";expires=new Date(Date.now()+30*60000);}
   else if(x.action==="counter"){if(!customer||r.status!=="CUSTOMER_CONFIRM")throw new MarketError("Wait for the kitchen proposal before changing the time.");time=new Date(x.scheduledFor);status="KITCHEN_REVIEW";expires=new Date(Date.now()+48*3600000);}
   assertProductSlot(r.product,time);
   if(x.action==="confirm"){
    if(!customer||r.status!=="CUSTOMER_CONFIRM")throw new MarketError("The kitchen must agree to the delivery time before checkout.");
    await lockWallet(tx,u.id);await ensurePilotWallet(tx,u.id);const subtotal=Math.round(Number(r.unitPrice)*100)*r.quantity/100,total=Math.round((subtotal+Number(r.deliveryFee))*100)/100,walletUsed=Math.min(await walletBalance(tx,u.id),total),due=Math.round((total-walletUsed)*100)/100;
    // Product and request locks use a consistent order. Stock is reserved only at final customer checkout.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"product:"+r.productId},0))`;
    r.product=await tx.foodProduct.findUniqueOrThrow({where:{id:r.productId},include:productInclude});
    if(!availableProduct(r.product)||(r.snapshot as Record<string,string>).terms!==productTerms(r.product))throw new MarketError("Product terms or availability changed. Review a new request before ordering.");assertProductSlot(r.product,time);assertProductArea(r.product,r.address);
    const stock=await tx.foodProduct.updateMany({where:{id:r.productId,isActive:true,stockCount:{gte:r.quantity},OR:[{preparationMode:"MADE_TO_ORDER"},{readyUntil:{gte:time}}]},data:{stockCount:{decrement:r.quantity}}});if(stock.count!==1)throw new MarketError("The last units were reserved by someone else. No wallet funds were used.");
    const order=await tx.order.create({data:{orderNumber:"PP-"+Date.now().toString(36).toUpperCase()+"-"+randomUUID().slice(0,8).toUpperCase(),customerId:u.id,motherId:r.product.meal.kitchen.motherId,kitchenId:r.product.meal.kitchenId,addressId:r.addressId,status:"CONFIRMED",paymentStatus:due===0?"CAPTURED":"PENDING",scheduledFor:time,subtotal,deliveryFee:r.deliveryFee,taxAmount:0,totalAmount:total,policySnapshot:{...DELIVERY_WINDOW_POLICY,kind:"PRODUCT",productRequestId:r.id,cutoffHours:CANCELLATION_CUTOFF_HOURS,operationFeeINR:CANCELLATION_OPERATION_FEE_INR},items:{create:{mealId:r.product.mealId,mealName:(r.snapshot as Record<string,string>).name,quantity:r.quantity,unitPrice:r.unitPrice,lineTotal:subtotal,dietarySnapshot:{productId:r.productId,unit:r.product.unitLabel,ingredients:r.product.meal.ingredients,allergens:r.product.meal.allergens,requestId:r.id,storage:r.product.storageInstructions,shelfLifeHours:r.product.shelfLifeHours,readyUntil:r.product.readyUntil?.toISOString()??null,category:r.product.meal.category}}},...(due>0?{payments:{create:{provider:"not_configured",status:"PENDING",amount:due,currency:"INR"}}}:{}),events:{create:[{actorUserId:u.id,status:"ORDER_PLACED",detail:"Product ordered after both sides agreed the delivery time."},{actorUserId:motherId,status:"CONFIRMED",detail:"Kitchen time agreement recorded; customer completed checkout."}]}}});
    if(walletUsed>0)await tx.walletLedgerEntry.create({data:{userId:u.id,orderId:order.id,direction:"DEBIT",amount:walletUsed,reference:"product-request:"+r.id,description:"Wallet applied to "+order.orderNumber}});
    await tx.productRequest.update({where:{id:r.id},data:{status:"CONFIRMED",version:{increment:1},orderId:order.id,history:[...log,{role:u.role,action:"CHECKOUT",at:new Date().toISOString(),deliveryAt:time.toISOString()}] as Prisma.InputJsonValue}});
    await tx.notification.createMany({data:[{userId:u.id,title:"Product order confirmed",body:order.orderNumber+" is in Your orders & tracking. Remaining due ₹"+due.toFixed(2)+"; no online charge was made.",kind:"ORDER",entityId:order.id},{userId:motherId,title:"Product checkout completed",body:order.orderNumber+" · prepare for the agreed delivery time.",kind:"ORDER",entityId:order.id}]});return {id:r.id,orderId:order.id,amountDue:due,message:"Order saved for the agreed time. Any amount not covered by wallet remains due; no online charge was made."};
   }
  }
  await tx.productRequest.update({where:{id:r.id},data:{status,scheduledFor:time,expiresAt:expires,version:{increment:1},history:[...log,{role:u.role,action:x.action.toUpperCase(),at:new Date().toISOString(),deliveryAt:time.toISOString()}] as Prisma.InputJsonValue}});
  await tx.notification.create({data:{userId:customer?motherId:r.customerId,title:"Product delivery request updated",body:status==="CUSTOMER_CONFIRM"?"Kitchen agreed a time. Review and confirm checkout within 30 minutes. Stock is not held yet.":"A product request needs your review in Marketplace.",kind:"ORDER",entityId:r.id}});return {id:r.id,message:status==="CUSTOMER_CONFIRM"?"Time proposed. The customer must confirm and check out within 30 minutes.":"Request updated. No payment was taken."};
 },{timeout:15000});scheduleEntityPush([result.orderId??result.id]);if(result.orderId)scheduleCourierOffers([result.orderId]);return NextResponse.json(result);
 }catch(e){if(e instanceof MarketError)return NextResponse.json({error:e.message},{status:e.status});console.error("Product request failed",e instanceof Error?e.name:"");return serviceUnavailable();}}
