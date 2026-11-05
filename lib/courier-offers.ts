import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { distanceMeters } from "@/lib/marketplace-rules";
import { sendPendingPush } from "@/lib/web-push";
export type CourierArea = { isAvailable: boolean; serviceCity: string | null; serviceLatitude: unknown; serviceLongitude: unknown; serviceRadiusMeters: number };
export function courierCovers(area: CourierArea, kitchen: { city: string; latitude: unknown; longitude: unknown }) {
  return area.isAvailable && Boolean(area.serviceCity) && area.serviceCity!.trim().toLowerCase() === kitchen.city.trim().toLowerCase() && area.serviceLatitude != null && area.serviceLongitude != null && kitchen.latitude != null && kitchen.longitude != null && distanceMeters({ latitude:Number(area.serviceLatitude),longitude:Number(area.serviceLongitude) }, { latitude:Number(kitchen.latitude),longitude:Number(kitchen.longitude) }) <= area.serviceRadiusMeters;
}
export function scheduleCourierOffers(orderIds: string[]) {
  after(async () => {
    try {
      const orders = await prisma.order.findMany({ where: { id:{in:orderIds}, orderNumber:{not:{startsWith:"TEST-LIFE-"}}, status:{in:["ORDER_PLACED","CONFIRMED","PREPARING","READY_FOR_PICKUP"]} }, include:{kitchen:true} });
      const agents = await prisma.deliveryAgentProfile.findMany({ where:{isAvailable:true,verificationStatus:"APPROVED",user:{status:"ACTIVE",email:{not:{endsWith:"@paustik.invalid"}}}} });
      const recipients = new Set<string>();
      for(const order of orders) for(const agent of agents.filter(a=>courierCovers(a,order.kitchen)).slice(0,30)) {
        const title=order.status === "READY_FOR_PICKUP" ? "Nearby delivery ready for pickup" : "New upcoming delivery nearby";
        await prisma.$transaction(async tx=>{
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"courier-offer:"+order.id+":"+agent.userId},0))`;
          const exists=await tx.notification.findFirst({where:{userId:agent.userId,entityId:order.id,title,kind:"DELIVERY"}});
          if(!exists)await tx.notification.create({data:{userId:agent.userId,entityId:order.id,title,kind:"DELIVERY",body:order.kitchen.name+" · "+order.kitchen.locality+". Open Your deliveries for the estimated pay and pickup time. Assignment is not guaranteed."}});
        });
        recipients.add(agent.userId);
      }
      await sendPendingPush([...recipients]);
    }catch{console.error("Nearby courier offer dispatch could not finish.");}
  });
}
