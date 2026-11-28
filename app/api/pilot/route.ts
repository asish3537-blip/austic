import {MEAL_PRICE_TIERS} from "@/lib/marketplace-rules";
import {randomInt,randomUUID,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {rejectCrossOrigin} from "@/lib/http";
import {prisma} from "@/lib/prisma";
import {indiaDate} from "@/lib/service-windows";
import {pilotMenus,publicPilotEnabled,type PilotOverrides} from "@/lib/pilot-catalog";
import {pilotTransition} from "@/lib/pilot-payment-policy";
import {capturePilotReceipt,pilotGateway,pilotRazorpayConfig,refundPilotOrder,validRazorpaySignature} from "@/lib/pilot-payments";
import type {Prisma} from "@/app/generated/prisma/client";
import {publicPilotSnapshot} from "@/lib/order-photo-policy";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
const meal=z.object({tier:z.enum(["BASE","EGG","CHEESE","CHICKEN","DESI_CHICKEN","MUTTON","MUSHROOM"]).default("BASE"),description:z.string().trim().min(3).max(800),id:z.string().min(1).max(80).optional(),name:z.string().trim().min(3).max(90),price:z.number().int().min(1).max(1000000),components:z.array(z.string().trim().min(1).max(70)).max(3).default([]),ingredients:z.string().max(500).default(""),allergens:z.string().max(300).default(""),servings:z.number().int().min(0).max(200),oneTimeOnly:z.boolean()}).refine(m=>m.oneTimeOnly||m.price>=MEAL_PRICE_TIERS[m.tier].startingPrice,{message:"Set a price from the selected meal starting price."});
const input=z.discriminatedUnion("action",[
 z.object({action:z.literal("saveMeal"),kitchenId:z.string().max(60),meal}),
 z.object({action:z.literal("checkout"),requestKey:z.string().uuid(),kitchenId:z.string().max(60),mealId:z.string().max(80),quantity:z.number().int().min(1).max(3),days:z.union([z.literal(1),z.number().int().min(3).max(7)]),serviceDate:z.iso.date(),acknowledged:z.literal(true)}),
 z.object({action:z.literal("confirm"),orderId:z.string().uuid(),paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/i)}),
 z.object({action:z.literal("reconcile"),orderId:z.string().uuid()}),
 z.object({action:z.literal("refund"),orderId:z.string().uuid()}),
 z.object({action:z.literal("advance"),orderId:z.string().uuid(),role:z.enum(["customer","mother","courier"]),status:z.string().max(30),code:z.string().regex(/^\d{4}$/).optional()}),
]);
async function workspace(ownerId:string){return prisma.pilotWorkspace.upsert({where:{ownerId},create:{ownerId},update:{}});}
export async function GET(request:Request){
 if(!publicPilotEnabled())return NextResponse.json({error:"Public pilot is closed."},{status:403,headers});
 const user=await getCurrentUser();if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to use your private practice workspace."},{status:403,headers});
 try{const w=await workspace(user.id),role=new URL(request.url).searchParams.get("role")||"customer";
  const orders=await prisma.pilotOrder.findMany({where:{workspaceId:w.id},orderBy:{createdAt:"desc"},take:60});
  return NextResponse.json({kitchens:pilotMenus(w.menus),checkoutReady:Boolean(pilotRazorpayConfig()),mode:"test",workspace:"Personal practice workspace; roles here do not change your real account.",orders:orders.map(o=>({id:o.id,status:o.status,paymentStatus:o.paymentStatus,quantity:o.quantity,amountPaise:o.amountPaise,snapshot:publicPilotSnapshot(o.snapshot),events:o.events,createdAt:o.createdAt,...(role==="mother"?{pickupCode:o.pickupCode}:{}),...(role==="customer"?{deliveryCode:o.deliveryCode}:{})}))},{headers});
 }catch{return NextResponse.json({error:"Your practice workspace could not load."},{status:503,headers});}
}
export async function POST(request:Request){
 const denied=rejectCrossOrigin(request);if(denied)return denied;
 if(!publicPilotEnabled())return NextResponse.json({error:"Public pilot is closed."},{status:403,headers});
 const user=await getCurrentUser();if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to use your private practice workspace."},{status:403,headers});
 const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:"Request too large."},{status:413,headers});
 let body:unknown;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:"Check the practice request."},{status:400,headers});}
 const parsed=input.safeParse(body);if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Check the practice request."},{status:400,headers});
 const data=parsed.data;
 try{
  const w=await workspace(user.id);
  if(data.action==="refund")return NextResponse.json(await refundPilotOrder(data.orderId,w.id),{headers});
  if(data.action==="saveMeal"){
   await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-workspace:"+w.id},0))`;
    const current=await tx.pilotWorkspace.findUniqueOrThrow({where:{id:w.id}}),kitchen=pilotMenus(current.menus).find(k=>k.id===data.kitchenId);if(!kitchen)throw Error("Practice kitchen not found.");
    const saved={...data.meal,id:data.meal.id||"meal-"+randomUUID()};
    if(data.meal.id&&!kitchen.meals.some(m=>m.id===data.meal.id))throw Error("Practice meal not found.");
    const list=data.meal.id?kitchen.meals.map(m=>m.id===saved.id?saved:m):[...kitchen.meals,saved];if(list.length>12)throw Error("Keep up to twelve practice dishes per kitchen.");
    const overrides=(current.menus??{}) as PilotOverrides;
    await tx.pilotWorkspace.update({where:{id:w.id},data:{menus:{...overrides,[kitchen.id]:list} as unknown as Prisma.InputJsonValue}});
   });
   return NextResponse.json({saved:true,message:"Practice menu saved. Your customer view now shows this dish."},{headers});
  }
  if(data.action==="advance"){
   const outcome=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-workspace:"+w.id},0))`;
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-order:"+data.orderId},0))`;
    const order=await tx.pilotOrder.findFirst({where:{id:data.orderId,workspaceId:w.id}});if(!order)throw Error("Practice order not found.");
    const cancelPending=data.role==="customer"&&data.status==="CANCELLED"&&order.status==="PAYMENT_PENDING";
    if(!cancelPending&&!pilotTransition(data.role,order.status,data.status,order.paymentStatus==="CAPTURED"))throw Error("Complete the previous practice step first.");
    if(data.status==="DELIVERY_ASSIGNED"&&await tx.pilotOrder.count({where:{workspaceId:w.id,status:{in:["DELIVERY_ASSIGNED","PICKED_UP","OUT_FOR_DELIVERY"]}}})>=3)throw Error("Practice courier capacity is three active orders.");
    if(["PICKED_UP","DELIVERED"].includes(data.status)){
     if(order.lockedUntil&&order.lockedUntil>new Date())throw Error("Too many incorrect codes. Try again in ten minutes.");
     const expected=data.status==="PICKED_UP"?order.pickupCode:order.deliveryCode;
     if(!data.code||data.code.length!==expected.length||!timingSafeEqual(Buffer.from(data.code),Buffer.from(expected))){const failures=order.failedAttempts+1;await tx.pilotOrder.update({where:{id:order.id},data:{failedAttempts:failures,lockedUntil:failures>=5?new Date(Date.now()+600000):null}});return{error:"Incorrect practice handover code."};}
    }
    const events=Array.isArray(order.events)?order.events:[];
    await tx.pilotOrder.update({where:{id:order.id},data:{status:data.status,failedAttempts:0,lockedUntil:null,events:[...events,{status:data.status,detail:"Practice "+data.role+" update. No actual fulfilment.",at:new Date().toISOString()}]}});
    return{updated:true,needsRefund:data.status==="CANCELLED"&&order.paymentStatus==="CAPTURED"};
   });
   if("needsRefund" in outcome&&outcome.needsRefund){
    try{return NextResponse.json({...outcome,...await refundPilotOrder(data.orderId,w.id)},{headers});}
    catch{return NextResponse.json({...outcome,refundPending:true,message:"Practice order cancelled. Test refund is not confirmed yet. Use Check Test refund to retry safely."},{headers});}
   }
   return NextResponse.json(outcome,{status:"error" in outcome?400:200,headers});
  }
  const config=pilotRazorpayConfig();if(!config)return NextResponse.json({error:"Pilot Razorpay Test keys are not configured. No Live checkout is offered for sample kitchens."},{status:503,headers});
  if(data.action==="confirm"||data.action==="reconcile"){
   const order=await prisma.pilotOrder.findFirst({where:{id:data.orderId,workspaceId:w.id}});if(!order?.providerOrderId)throw Error("Practice payment not found.");
   if(data.action==="reconcile"&&order.status==="CANCELLED"&&["CAPTURED","REFUND_PENDING","REFUNDED"].includes(order.paymentStatus))return NextResponse.json(await refundPilotOrder(order.id,w.id),{headers});
   if(data.action==="confirm"){
    if(!validRazorpaySignature(order.providerOrderId+"|"+data.paymentId,data.signature,config.secret))return NextResponse.json({error:"Test payment signature did not match."},{status:400,headers});
    return NextResponse.json(await capturePilotReceipt(order.providerOrderId,data.paymentId),{headers});
   }
   const remote=await pilotGateway("orders/"+encodeURIComponent(order.providerOrderId)+"/payments");const captured=remote.items?.find((p:{status:string})=>p.status==="captured");return NextResponse.json(captured?await capturePilotReceipt(order.providerOrderId,captured.id):{paid:false},{headers});
  }
  const result=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-workspace:"+w.id},0))`;
   const current=await tx.pilotWorkspace.findUniqueOrThrow({where:{id:w.id}}),kitchen=pilotMenus(current.menus).find(k=>k.id===data.kitchenId),dish=kitchen?.meals.find(m=>m.id===data.mealId);
   if(!kitchen||!dish||dish.servings<data.quantity)throw Error("Choose an available practice meal and quantity.");
   if(dish.oneTimeOnly&&data.days!==1)throw Error("One-day specials cannot be added to a meal plan.");
   const first=indiaDate(new Date()),last=new Date(first+"T00:00:00Z");last.setUTCDate(last.getUTCDate()+6);
   if(data.serviceDate<first||data.serviceDate>last.toISOString().slice(0,10))throw Error("Choose a serving date within the next seven days.");
   const dates=Array.from({length:data.days},(_,i)=>{const d=new Date(data.serviceDate+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
   if(dates.at(-1)!>last.toISOString().slice(0,10))throw Error("Keep all plan dates within the next seven days.");
   let order=await tx.pilotOrder.findUnique({where:{workspaceId_requestKey:{workspaceId:w.id,requestKey:data.requestKey}}});
   if(!order){if(await tx.pilotOrder.count({where:{workspaceId:w.id,createdAt:{gte:new Date(Date.now()-86400000)}}})>=60)throw Error("Your practice workspace has reached its daily order limit.");
    order=await tx.pilotOrder.create({data:{workspaceId:w.id,requestKey:data.requestKey,quantity:data.quantity,amountPaise:(dish.price*data.quantity+9)*data.days*100,snapshot:{kitchenId:kitchen.id,kitchenName:kitchen.name,area:kitchen.area,mealId:dish.id,mealName:dish.name,foodPrice:dish.price,days:data.days,dates,deliveryPerDay:9,pilot:true},pickupCode:String(randomInt(1000,10000)),deliveryCode:String(randomInt(1000,10000)),events:[{status:"PAYMENT_PENDING",detail:"Practice order created. Razorpay Test only; no real charge or food delivery.",at:new Date().toISOString()}]}});
   }
   if(order.paymentStatus==="CAPTURED")return{paid:true,orderId:order.id};
   if(order.status!=="PAYMENT_PENDING")throw Error("This practice checkout is closed.");
   let providerOrderId=order.providerOrderId;
   if(!providerOrderId){const remote=await pilotGateway("orders",{amount:order.amountPaise,currency:"INR",receipt:order.id,partial_payment:false,notes:{purpose:"paustik_pilot_test_only"}});if(!/^order_[A-Za-z0-9]+$/.test(remote.id)||remote.amount!==order.amountPaise||remote.currency!=="INR")throw Error("Test checkout did not match the practice order.");providerOrderId=remote.id;await tx.pilotOrder.update({where:{id:order.id},data:{providerOrderId}});}
   return{orderId:order.id,key:config.id,providerOrderId,amount:order.amountPaise,currency:"INR",mode:"test",localFixture:process.env.PAUSTIK_LOCAL_PILOT==="true"&&process.env.DATABASE_URL?.startsWith("postgresql://pilot:local-fixture-only@127.0.0.1:55490/"),description:"Paustik pilot — no food delivery"};
  },{timeout:20000});
  return NextResponse.json(result,{headers});
 }catch(error){return NextResponse.json({error:error instanceof Error&&error.name==="Error"?error.message:"Your practice request could not complete."},{status:409,headers});}
}
