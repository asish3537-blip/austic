import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {repeatMenuDates} from "@/lib/menu-repeat";
import {slotAllowed,componentsAllowed} from "@/lib/service-windows";
import {mealDeliveryInstant,mealPriceAllowed} from "@/lib/marketplace-rules";
class ScheduleError extends Error{}
export async function GET(){
 const user=await getCurrentUser();if(!user||user.role!=="MOTHER"||user.status!=="ACTIVE")return NextResponse.json({error:"Mother access required."},{status:403});
 try{const meals=await prisma.meal.findMany({where:{kitchen:{mother:{userId:user.id}},product:null},orderBy:{updatedAt:"desc"},take:100,select:{id:true,name:true,price:true,components:true,ingredients:true,allergens:true,oneTimeOnly:true,menus:{orderBy:{serviceDate:"desc"},take:1,select:{deliveryTime:true,mealPeriod:true,stockCount:true}}}});return NextResponse.json({meals:meals.map(m=>({...m,price:Number(m.price),deliveryTime:m.menus[0]?.deliveryTime??"12:30",mealPeriod:m.menus[0]?.mealPeriod??"LUNCH",servings:m.menus[0]?.stockCount??0,menus:undefined}))},{headers:{"Cache-Control":"private, no-store"}});}catch{return serviceUnavailable();}
}
const schema=z.object({mealId:z.string().uuid(),start:z.iso.date(),days:z.number().int().min(1).max(7),servings:z.number().int().min(1).max(200),mealPeriod:z.enum(["BREAKFAST","LUNCH","DINNER"]),deliveryTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)});
export async function POST(request:Request){
 const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
 const user=await getCurrentUser();if(!user||user.role!=="MOTHER"||user.status!=="ACTIVE")return NextResponse.json({error:"Mother access required."},{status:403});
 const result=schema.safeParse(await request.json().catch(()=>null));if(!result.success)return NextResponse.json({error:"Check the saved dish, dates and servings."},{status:400});
 const x=result.data;let dates:Date[];try{dates=repeatMenuDates(x.start,x.days);if(!slotAllowed(x.mealPeriod,x.deliveryTime))throw new Error("Choose a delivery time within this meal period.");if(mealDeliveryInstant(dates[0],x.deliveryTime)<=new Date())throw new Error("The first delivery time has passed. Choose tomorrow or a later time.");}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Check the menu dates."},{status:400});}
 try{const outcome=await prisma.$transaction(async tx=>{
  const meal=await tx.meal.findFirst({where:{id:x.mealId,kitchen:{mother:{userId:user.id}},product:null},include:{kitchen:true}});if(!meal)throw new ScheduleError("Choose a saved meal from your own kitchen.");
  if(!meal.oneTimeOnly&&(!mealPriceAllowed(meal.tier,Number(meal.price))||!componentsAllowed(x.mealPeriod,meal.components)))throw new ScheduleError("Update this saved dish to match the current meal price and component rules first.");
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"repeat-menu:"+meal.kitchenId},0))`;
  if(await tx.menu.count({where:{kitchenId:meal.kitchenId,mealId:meal.id,mealPeriod:x.mealPeriod,serviceDate:{in:dates}}}))throw new ScheduleError("This dish already has a slot on one of those dates. Your existing stock was not changed.");
  const published=meal.kitchen.verificationStatus==="APPROVED"&&meal.kitchen.isAcceptingOrders&&meal.kitchen.latitude!==null&&meal.kitchen.longitude!==null;
  for(const serviceDate of dates){const start=new Date(serviceDate);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
   const cycle=await tx.menuCycle.upsert({where:{kitchenId_startsOn_endsOn:{kitchenId:meal.kitchenId,startsOn:start,endsOn:end}},create:{kitchenId:meal.kitchenId,name:"Week of "+start.toISOString().slice(0,10),startsOn:start,endsOn:end,status:published?"PUBLISHED":"DRAFT",publishedAt:published?new Date():null},update:{}});
   await tx.menu.create({data:{kitchenId:meal.kitchenId,mealId:meal.id,cycleId:cycle.id,serviceDate,mealPeriod:x.mealPeriod,deliveryTime:x.deliveryTime,stockCount:x.servings,isAvailable:published}});
   if(published&&cycle.status!=="PUBLISHED")await tx.menuCycle.update({where:{id:cycle.id},data:{status:"PUBLISHED",publishedAt:new Date()}});
  }
  if(published)await tx.meal.update({where:{id:meal.id},data:{isAvailable:true}});
  return{days:dates.length,published};
 },{timeout:20000});return NextResponse.json({...outcome,message:outcome.published?"Saved dish scheduled and listed for the selected days.":"Saved dish scheduled as draft. Kitchen approval, accepting orders and a pickup pin are required."},{status:201});}catch(e){if(e instanceof ScheduleError)return NextResponse.json({error:e.message},{status:409});console.error("Meal repeat failed",e instanceof Error?e.name:"");return serviceUnavailable();}
}
