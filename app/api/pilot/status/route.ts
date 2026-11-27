import {NextResponse} from "next/server";
import {publicPilotEnabled} from "@/lib/pilot-catalog";
import {pilotRazorpayConfig} from "@/lib/pilot-payments";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({enabled:publicPilotEnabled(),checkoutMode:pilotRazorpayConfig()?"test":"unavailable",verification:"configuration-only",realMoney:false},{headers:{"Cache-Control":"no-store"}});}
