import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin } from "@/lib/http";
const schema=z.object({motherBasisPoints:z.number().int().min(0).max(10000),courierBase:z.number().min(9).max(1000),includedKm:z.number().min(0).max(20),perKm:z.number().min(0).max(100),courierCap:z.number().min(9).max(1000)}).refine(p=>p.courierCap>=p.courierBase);
export async function POST(request:Request){
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
  const user=await getCurrentUser();if(!user||user.role!=="ADMIN"||user.status!=="ACTIVE")return NextResponse.json({error:"Admin access required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Use valid rates, with courier base at least ₹9 and cap at least the base."},{status:400});
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended('earnings-estimate-policy',0))`;
    await tx.earningsEstimatePolicy.updateMany({where:{isActive:true},data:{isActive:false}});
    const next=await tx.earningsEstimatePolicy.create({data:parsed.data});
    await tx.adminActivityLog.create({data:{adminId:user.id,action:"EARNINGS_ESTIMATE_POLICY_CHANGED",entityType:"EARNINGS_ESTIMATE_POLICY",entityId:next.id,newValue:parsed.data}});
  });
  return NextResponse.json({saved:true,message:"Estimation settings saved. Existing accepted courier estimates and actual ledgers are unchanged."});
}
