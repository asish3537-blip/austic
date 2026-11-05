import { createHash,timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin,serviceUnavailable } from "@/lib/http";
import { pilotWalletEnabled } from "@/lib/pilot-wallet";
import { seedDemoFamily } from "@/lib/demo-marketplace-seed";
export const maxDuration=60;
export async function POST(request:Request){
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
  const user=await getCurrentUser(),configured=process.env.PAUSTIK_PILOT_SEED_TOKEN||"",supplied=request.headers.get("authorization")?.replace(/^Bearer /,"")||"";
  const digest=(value:string)=>createHash("sha256").update(value).digest();const job=configured.length>=32&&timingSafeEqual(digest(configured),digest(supplied));
  if((!user||user.role!=="ADMIN"||user.status!=="ACTIVE")&&!job)return NextResponse.json({error:"Administrator access required."},{status:403});
  if(!pilotWalletEnabled())return NextResponse.json({error:"Pilot demo data is disabled."},{status:409});
  const input=z.object({family:z.number().int().min(1).max(10)}).safeParse(await request.json().catch(()=>null));if(!input.success)return NextResponse.json({error:"Choose a demo group from 1 to 10."},{status:400});
  try{return NextResponse.json(await seedDemoFamily(input.data.family),{headers:{"Cache-Control":"no-store"}});}catch(e){console.error("Paustik demo marketplace seed failed.",e instanceof Error?e.name:"unknown");return serviceUnavailable();}
}
