import {prisma} from "@/lib/prisma";
import {courierCovers} from "@/lib/courier-offers";
import type {Prisma} from "@/app/generated/prisma/client";

export const NO_COURIER_MESSAGE = "Currently no delivery agents are online for this kitchen. Products remain visible; please book when a delivery partner is available. Existing subscribed orders remain scheduled.";
export type PickupArea = {city:string;latitude:unknown;longitude:unknown};
export async function onlineCouriers(db:Pick<Prisma.TransactionClient,"deliveryAgentProfile"> = prisma){
 return db.deliveryAgentProfile.findMany({where:{isAvailable:true,verificationStatus:"APPROVED",user:{status:"ACTIVE",email:{not:{endsWith:"@paustik.invalid"}}}},select:{isAvailable:true,serviceCity:true,serviceLatitude:true,serviceLongitude:true,serviceRadiusMeters:true}});
}
export async function hasOnlineCourier(kitchen:PickupArea, db:Pick<Prisma.TransactionClient,"deliveryAgentProfile"> = prisma){
 return (await onlineCouriers(db)).some(agent=>courierCovers(agent,kitchen));
}
