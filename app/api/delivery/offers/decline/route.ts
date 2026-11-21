import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {courierCovers} from "@/lib/courier-area";
import {DispatchError,lockCourier} from "@/lib/delivery-batches";
import {canDeclineDeliveryOffer} from "@/lib/delivery-offer-response";
export const runtime="nodejs";
const schema=z.object({orderId:z.string().uuid()});
export async function POST(request:Request) {
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
  const user=await getCurrentUser();
  if(!user||user.role!=="DELIVERY_AGENT"||user.status!=="ACTIVE")return NextResponse.json({error:"An active delivery account is required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Choose a valid delivery offer."},{status:400});
  try {
    const agent=await prisma.deliveryAgentProfile.findUnique({where:{userId:user.id}});
    if(!agent||agent.verificationStatus!=="APPROVED")return NextResponse.json({error:"Courier approval required."},{status:403});
    await prisma.$transaction(async tx=>{
      await lockCourier(tx,agent.id);
      const key={agentId:agent.id,orderId:parsed.data.orderId};
      if(await tx.courierOfferDecline.findUnique({where:{agentId_orderId:key}}))return;
      const order=await tx.order.findUnique({where:{id:parsed.data.orderId},include:{kitchen:true,delivery:true,bulkDeliveryRequest:{select:{id:true}}}});
      if(!order||order.orderNumber.startsWith("TEST-LIFE-")||!canDeclineDeliveryOffer({orderStatus:order.status,deliveryStatus:order.delivery?.status??null,agentId:order.delivery?.agentId??null,bulk:Boolean(order.bulkDeliveryRequest),offeredHere:order.delivery?.agentId===agent.id||courierCovers(agent,order.kitchen)},agent.id))throw new DispatchError("This offer is no longer available. Accepted deliveries cannot be declined here.");
      if(order.delivery){
        // Also locks an unassigned row, so simultaneous accept/decline cannot leave it accepted by this courier.
        const released=await tx.delivery.updateMany({where:{id:order.delivery.id,status:"ASSIGNED",OR:[{agentId:null},{agentId:agent.id}],order:{status:{in:["ORDER_PLACED","CONFIRMED","PREPARING","READY_FOR_PICKUP"]}}},data:{agentId:null,assignedAt:null,batchId:null,handoverNonce:null}});
        if(released.count!==1)throw new DispatchError("The delivery changed. Refresh your offers.");
      }
      await tx.courierOfferDecline.create({data:key});
      await tx.notification.updateMany({where:{userId:user.id,entityId:order.id,kind:"DELIVERY",title:{in:["Nearby delivery ready for pickup","New upcoming delivery nearby"]}},data:{readAt:new Date(),emailPending:false}});
    });
    return NextResponse.json({declined:true});
  }catch(error){
    if(error instanceof DispatchError)return NextResponse.json({error:error.message},{status:409});
    console.error("Courier offer response failed",error instanceof Error?error.name:"unknown");return serviceUnavailable();
  }
}
