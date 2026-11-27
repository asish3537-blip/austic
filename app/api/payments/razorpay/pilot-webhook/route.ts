import {NextResponse} from "next/server";
import {capturePilotReceipt,pilotRazorpayConfig,validRazorpaySignature} from "@/lib/pilot-payments";
export const runtime="nodejs";
export async function POST(request:Request){
 const config=pilotRazorpayConfig();if(!config)return NextResponse.json({error:"Pilot Test checkout is unavailable."},{status:503});
 const raw=await request.text();if(raw.length>100000)return NextResponse.json({error:"Payload too large."},{status:413});
 const signature=request.headers.get("x-razorpay-signature")||"";
 if(!validRazorpaySignature(raw,signature,config.webhook))return NextResponse.json({error:"Invalid signature."},{status:401});
 try{const body=JSON.parse(raw);if(body.event!=="payment.captured")return NextResponse.json({received:true});const payment=body.payload?.payment?.entity;
  if(!/^order_[A-Za-z0-9]+$/.test(payment?.order_id)||!/^pay_[A-Za-z0-9]+$/.test(payment?.id))return NextResponse.json({error:"Invalid pilot receipt."},{status:400});
  const result=await capturePilotReceipt(payment.order_id,payment.id);return NextResponse.json({received:true,...result});
 }catch{return NextResponse.json({error:"Pilot receipt could not be verified."},{status:409});}
}
