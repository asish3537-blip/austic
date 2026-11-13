import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { scheduleEntityPush } from "@/lib/web-push";

export type SchoolTx = Prisma.TransactionClient;
export class ScoofooError extends Error { constructor(message:string,public status=409){super(message);} }
export async function lockSchoolBooking(tx:SchoolTx,id:string){await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"scoofoo:"+id},0))`;}
export async function schoolNotify(tx:SchoolTx,guardianId:string,courierId:string|null,entityId:string,title:string,body:string) {
  const courier=courierId?await tx.deliveryAgentProfile.findUnique({where:{id:courierId},select:{userId:true}}):null;
  const booking=await tx.scoofooBooking.findUnique({where:{id:entityId},select:{status:true,school:{select:{staffUserIds:true}}}});
  const admins=booking&&["REQUESTED","EXCEPTION"].includes(booking.status)?await tx.user.findMany({where:{role:"ADMIN",status:"ACTIVE"},select:{id:true},take:50}):[];
  const schoolStaff=booking&&["PICKED_UP","AT_SCHOOL","RECEIVED"].includes(booking.status)?booking.school.staffUserIds:[];
  const ids=[...new Set([guardianId,...(courier?[courier.userId]:[]),...schoolStaff,...admins.map(a=>a.id)])];
  await tx.notification.createMany({data:ids.map(userId=>({userId,title,body,kind:"DELIVERY",entityId,emailPending:true}))});
}
export async function flagLateSchoolTiffins(){
 const now=new Date();
 const bookings=await prisma.scoofooBooking.findMany({where:{lateAlertAt:null,arrivalDeadline:{lt:now},status:{in:["CONFIRMED","READY","PICKED_UP","AT_SCHOOL"]}},select:{id:true},take:50});
 const changed:string[]=[];
 for(const {id} of bookings){const result=await prisma.$transaction(async tx=>{
   await lockSchoolBooking(tx,id);
   const b=await tx.scoofooBooking.findUniqueOrThrow({where:{id}});
   if(b.lateAlertAt||["RECEIVED","CANCELLED","EXCEPTION"].includes(b.status)||b.arrivalDeadline>=now)return false;
   await tx.scoofooBooking.update({where:{id},data:{lateAlertAt:now}});
   await tx.scoofooEvent.create({data:{bookingId:id,status:b.status,note:"School reception deadline passed. Operations follow-up required; this does not confirm delivery or discard an in-transit tiffin."}});
   await schoolNotify(tx,b.guardianId,b.courierId,id,"ScooFoo delivery needs attention",`${b.reference}: the school reception deadline has passed. Contact operations for an update.`);
   const admins=await tx.user.findMany({where:{role:"ADMIN",status:"ACTIVE"},select:{id:true},take:50});
   if(admins.length)await tx.notification.createMany({data:admins.map(a=>({userId:a.id,title:"ScooFoo deadline alert",body:b.reference+" needs school delivery follow-up.",kind:"DELIVERY",entityId:id}))});
   return true;
 });if(result)changed.push(id);}
 if(changed.length)scheduleEntityPush(changed);
 return {schoolDeadlineAlerts:changed.length};
}
