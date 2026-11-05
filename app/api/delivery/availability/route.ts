import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin } from "@/lib/http";
const schema=z.discriminatedUnion("isAvailable",[z.object({isAvailable:z.literal(false)}),z.object({isAvailable:z.literal(true),city:z.string().trim().min(2).max(100),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),radiusKm:z.number().min(5).max(10),consent:z.literal(true)})]);
export async function POST(request:Request){
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
  const user=await getCurrentUser();if(!user||user.role!=="DELIVERY_AGENT"||user.status!=="ACTIVE")return NextResponse.json({error:"Courier access required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Choose a city, 5–10 km area and consent to use your location."},{status:400});
  const agent=await prisma.deliveryAgentProfile.findUnique({where:{userId:user.id}});if(!agent||agent.verificationStatus!=="APPROVED")return NextResponse.json({error:"Your courier profile needs approval first."},{status:403});
  const p=parsed.data;await prisma.deliveryAgentProfile.update({where:{id:agent.id},data:p.isAvailable?{isAvailable:true,serviceCity:p.city,serviceLatitude:p.latitude,serviceLongitude:p.longitude,serviceRadiusMeters:Math.round(p.radiusKm*1000)}:{isAvailable:false}});
  return NextResponse.json({saved:true,message:p.isAvailable?"You are online for nearby offers. Your service-area pin is separate from delivery GPS sharing.":"You are offline for new offers. You can still finish assigned deliveries."});
}
