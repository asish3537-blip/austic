import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, serviceUnavailable } from "@/lib/http";
import { deliveryHandoverCode,newHandoverNonce,matchesHandoverCode } from "@/lib/delivery-handover";
import { indiaSchoolDate,schoolBookingProblem,schoolDateTime,schoolTransitionAllowed,schoolWindowValid } from "@/lib/scoofoo-rules";
import { flagLateSchoolTiffins,lockSchoolBooking,schoolNotify,ScoofooError } from "@/lib/scoofoo";
import { lockCourier } from "@/lib/delivery-batches";
import { scheduleEntityPush } from "@/lib/web-push";

export const runtime="nodejs";
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schoolInput=z.object({action:z.literal("school"),id:z.string().uuid().optional(),name:z.string().trim().min(5).max(120),city:z.string().trim().min(3).max(80),address:z.string().trim().min(15).max(400),receptionPoint:z.string().trim().min(5).max(160),contactName:z.string().trim().max(80),contactPhone:z.string().trim().max(20),staffEmails:z.array(z.email()).max(10),status:z.enum(["SETTING_UP","APPROVED","PAUSED"]),lunchAt:time,arriveBy:time,pickupBy:time,bookingCutoff:time,weekdays:z.array(z.number().int().min(0).max(6)).min(1).max(7),holidays:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100),dailyCapacity:z.number().int().min(1).max(200),agreementNote:z.string().trim().max(500),agreementConfirmed:z.boolean()});
const bookInput=z.object({action:z.literal("book"),schoolId:z.string().uuid(),addressId:z.string().uuid(),dates:z.array(z.string()).min(1).max(7),tiffinLabel:z.string().trim().min(2).max(30),classSection:z.string().trim().min(1).max(30),boxCount:z.number().int().min(1).max(3),guardianConsent:z.literal(true)});
const stepInput=z.object({action:z.enum(["confirm","ready","assign","accept","decline","pickup","arrive","receive","cancel","exception","returned","location"]),bookingId:z.string().uuid(),courierId:z.string().uuid().optional(),otp:z.string().regex(/^\d{6}$/).optional(),note:z.string().trim().max(500).optional(),receiverName:z.string().trim().max(80).optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),accuracy:z.number().min(0).max(10000).optional()});
const payload=z.union([schoolInput,bookInput,stepInput]);

function schoolPublic(s:{id:string;name:string;city:string;address:string;receptionPoint:string;status:string;lunchAt:string;arriveBy:string;pickupBy:string;bookingCutoff:string;weekdays:number[];holidays:string[];dailyCapacity:number}){return {id:s.id,name:s.name,city:s.city,address:s.address,receptionPoint:s.receptionPoint,status:s.status,lunchAt:s.lunchAt,arriveBy:s.arriveBy,pickupBy:s.pickupBy,bookingCutoff:s.bookingCutoff,weekdays:s.weekdays,holidays:s.holidays,dailyCapacity:s.dailyCapacity};}

export async function GET(request:Request){
 const user=await getCurrentUser();
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to your active Paustik account."},{status:403});
 try{
  await flagLateSchoolTiffins();
  const params=new URL(request.url).searchParams;
  const desk=params.get("view")==="desk";
  const deskDay=params.get("day")??indiaSchoolDate();
  if(desk&&!z.iso.date().safeParse(deskDay).success)return NextResponse.json({error:"Choose a valid school manifest date."},{status:400});
  const schools=await prisma.scoofooSchool.findMany({where:desk?{staffUserIds:{has:user.id}}:{},orderBy:{name:"asc"},take:100});
  if(desk&&(!schools.length||!user.emailVerifiedAt||!["CUSTOMER","MOTHER","ADMIN"].includes(user.role))&&user.role!=="ADMIN")return NextResponse.json({error:"This account is not linked to a school reception desk. Ask Paustik operations to link your school-approved account."},{status:403});
  const courier=user.role==="DELIVERY_AGENT"?await prisma.deliveryAgentProfile.findUnique({where:{userId:user.id}}):null;
  const where=user.role==="ADMIN"?{}:desk?{schoolId:{in:schools.map(s=>s.id)},serviceDate:deskDay}:courier?{courierId:courier.id}:{guardianId:user.id};
  const bookings=await prisma.scoofooBooking.findMany({where,include:{events:{orderBy:{createdAt:"asc"}},school:true},orderBy:[{serviceDate:"desc"},{createdAt:"desc"}],take:100});
  const canBook=["CUSTOMER","MOTHER"].includes(user.role)&&!desk;
  const addresses=canBook?await prisma.address.findMany({where:{userId:user.id},select:{id:true,label:true,addressLine1:true,locality:true,city:true},orderBy:{isDefault:"desc"}}):[];
  const couriers=user.role==="ADMIN"?await prisma.deliveryAgentProfile.findMany({where:{verificationStatus:"APPROVED",user:{status:"ACTIVE"}},select:{id:true,mealCapacity:true,user:{select:{name:true}}},take:100}):[];
  const staffIds=user.role==="ADMIN"?[...new Set(schools.flatMap(s=>s.staffUserIds))]:[];
  const staff=staffIds.length?await prisma.user.findMany({where:{id:{in:staffIds}},select:{id:true,email:true}}):[];
  const mapped=bookings.map(b=>{
   const isGuardian=b.guardianId===user.id;const privatePickup=user.role==="ADMIN"||isGuardian||(courier&&b.courierId===courier.id&&Boolean(b.courierAcceptedAt)&&!["RECEIVED","CANCELLED","RETURNED"].includes(b.status));
   const gpsFresh=b.locationUpdatedAt&&Date.now()-b.locationUpdatedAt.getTime()<300000&&["PICKED_UP","AT_SCHOOL"].includes(b.status);
   return {id:b.id,reference:b.reference,schoolId:b.schoolId,schoolName:b.school.name,serviceDate:b.serviceDate,tiffinLabel:b.tiffinLabel,classSection:b.classSection,boxCount:b.boxCount,status:b.status,courierId:b.courierId,courierAcceptedAt:b.courierAcceptedAt,pickupDeadline:b.pickupDeadline,arrivalDeadline:b.arrivalDeadline,lateAlertAt:b.lateAlertAt,schoolSnapshot:b.schoolSnapshot,pickupSnapshot:privatePickup?b.pickupSnapshot:null,pickupCode:isGuardian&&b.courierId&&b.courierAcceptedAt&&["CONFIRMED","READY"].includes(b.status)?deliveryHandoverCode("scoofoo:"+b.id,b.pickupNonce):null,receivedBy:b.receivedBy,receivedAt:b.receivedAt,receiptMethod:b.receiptMethod,events:b.events.map(e=>({status:e.status,note:e.note,createdAt:e.createdAt})),location:gpsFresh&&privatePickup?{latitude:b.latitude,longitude:b.longitude,updatedAt:b.locationUpdatedAt}:null};
  });
  return NextResponse.json({role:user.role,desk,canBook,today:indiaSchoolDate(),schools:user.role==="ADMIN"?schools.map(s=>({...s,staffEmails:staff.filter(u=>s.staffUserIds.includes(u.id)).map(u=>u.email)})):schools.map(schoolPublic),bookings:mapped,addresses,couriers},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return serviceUnavailable();}
}

export async function POST(request:Request){
 const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
 const user=await getCurrentUser();if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Active sign-in required."},{status:403});
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Check the school, delivery dates, required fields and consent."},{status:400});
 const x=parsed.data;
 try{
  if(x.action==="school"){
   if(user.role!=="ADMIN")throw new ScoofooError("Admin access required.",403);
   if(!schoolWindowValid(x))throw new ScoofooError("Use an ordered booking/pickup/arrival window, with arrival at least 15 minutes before lunch.");
   const staff=await prisma.user.findMany({where:{email:{in:x.staffEmails.map(e=>e.toLowerCase())},status:"ACTIVE",emailVerifiedAt:{not:null},role:{in:["CUSTOMER","MOTHER"]}},select:{id:true}});
   if(staff.length!==new Set(x.staffEmails.map(e=>e.toLowerCase())).size)throw new ScoofooError("Every school desk email must belong to an active, email-verified customer or mother account.");
   if(x.status==="APPROVED"&&(!x.agreementConfirmed||x.agreementNote.length<15||x.contactName.length<2||!/^\+?[0-9 ]{10,16}$/.test(x.contactPhone)||!staff.length))throw new ScoofooError("Before approval, record the receiving adult, phone, school agreement and at least one authorised school desk account.");
   const {action,id,staffEmails,agreementConfirmed,...fields}=x;void action;void staffEmails;void agreementConfirmed;
   const saved=await prisma.$transaction(async tx=>{const school=await tx.scoofooSchool.upsert({where:{id:id??randomUUID()},create:{...fields,staffUserIds:staff.map(s=>s.id)},update:{...fields,staffUserIds:staff.map(s=>s.id)}});await tx.adminActivityLog.create({data:{adminId:user.id,action:"SCOOFOO_SCHOOL_SETTINGS",entityType:"ScoofooSchool",entityId:school.id,newValue:{status:x.status,staffCount:staff.length}}});return school;});
   return NextResponse.json({saved:true,id:saved.id});
  }
  if(x.action==="book"){
   if(!["CUSTOMER","MOTHER"].includes(user.role))throw new ScoofooError("Use a parent/customer or mother account to book home tiffin pickup.",403);
   const address=await prisma.address.findFirst({where:{id:x.addressId,userId:user.id}});if(!address)throw new ScoofooError("Choose your saved home pickup address.");
   const ids=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"scoofoo-school:"+x.schoolId},0))`;
    const school=await tx.scoofooSchool.findUniqueOrThrow({where:{id:x.schoolId}});
    if(school.status==="PAUSED")throw new ScoofooError("This school route is paused.");
    if(address.city.trim().toLowerCase()!==school.city.trim().toLowerCase())throw new ScoofooError("Choose a pickup address in the school's pilot city. Operations will check the route.");
    const result:string[]=[];
    for(const date of [...new Set(x.dates)].sort()){
     const problem=schoolBookingProblem(date,school);if(problem)throw new ScoofooError(problem);
     const old=await tx.scoofooBooking.findUnique({where:{guardianId_schoolId_serviceDate_tiffinLabel:{guardianId:user.id,schoolId:school.id,serviceDate:date,tiffinLabel:x.tiffinLabel}}});
     if(old){if(old.status==="CANCELLED"||old.boxCount!==x.boxCount||old.classSection!==x.classSection)throw new ScoofooError("That label already has a booking for this date. Use its existing booking or another label.");result.push(old.id);continue;}
     const count=await tx.scoofooBooking.aggregate({where:{schoolId:school.id,serviceDate:date,status:{notIn:["CANCELLED","RETURNED"]}},_sum:{boxCount:true}});
     if(Number(count._sum.boxCount??0)+x.boxCount>school.dailyCapacity)throw new ScoofooError("That school day's tiffin capacity is full.");
     const b=await tx.scoofooBooking.create({data:{reference:"SF-"+date.replaceAll("-","")+"-"+randomUUID().slice(0,6).toUpperCase(),guardianId:user.id,schoolId:school.id,serviceDate:date,tiffinLabel:x.tiffinLabel,classSection:x.classSection,boxCount:x.boxCount,pickupSnapshot:{address:[address.addressLine1,address.addressLine2,address.locality,address.city,address.pinCode].filter(Boolean).join(", "),phone:address.phone,recipientName:address.recipientName,latitude:address.latitude?.toString()??null,longitude:address.longitude?.toString()??null},schoolSnapshot:{name:school.name,address:school.address,receptionPoint:school.receptionPoint,lunchAt:school.lunchAt},pickupDeadline:schoolDateTime(date,school.pickupBy),arrivalDeadline:schoolDateTime(date,school.arriveBy),consentAt:new Date(),pickupNonce:newHandoverNonce()}});
     await tx.scoofooEvent.create({data:{bookingId:b.id,actorId:user.id,status:"REQUESTED",note:"Guardian requested home pickup and delivery to school reception. Subject to school and route confirmation; no payment collected."}});
     await schoolNotify(tx,user.id,null,b.id,"ScooFoo request received",`${b.reference}: awaiting school and route confirmation.`);
     result.push(b.id);
    }return result;
   });scheduleEntityPush(ids);return NextResponse.json({saved:true,bookingIds:ids},{status:201});
  }
  const result=await prisma.$transaction(async tx=>{
   await lockSchoolBooking(tx,x.bookingId);
   const b=await tx.scoofooBooking.findUniqueOrThrow({where:{id:x.bookingId},include:{school:true}});
   const isAdmin=user.role==="ADMIN",isGuardian=b.guardianId===user.id;
   const agent=user.role==="DELIVERY_AGENT"?await tx.deliveryAgentProfile.findUnique({where:{userId:user.id}}):null;
   const isCourier=agent?.id===b.courierId&&agent?.verificationStatus==="APPROVED";
   const isSchool=Boolean(user.emailVerifiedAt)&&["CUSTOMER","MOTHER"].includes(user.role)&&b.school.staffUserIds.includes(user.id);
   if(!(isAdmin||isGuardian||isCourier||isSchool))throw new ScoofooError("This tiffin is not assigned to your account.",403);
   if(b.courierId&&x.action!=="assign")await lockCourier(tx,b.courierId);
   if(["accept","decline"].includes(x.action)){
    if(!isCourier||!["CONFIRMED","READY"].includes(b.status)||new Date()>=b.pickupDeadline)throw new ScoofooError("Only the assigned courier can respond before collection closes.",403);
    if(x.action==="accept"&&(b.school.status!=="APPROVED"||await tx.delivery.count({where:{agentId:b.courierId!,status:{notIn:["DELIVERED","CANCELLED","FAILED"]}}})))throw new ScoofooError("Complete ordinary deliveries and confirm the approved school route before accepting.");
    await tx.scoofooBooking.update({where:{id:b.id},data:x.action==="accept"?{courierAcceptedAt:new Date()}:{courierId:null,courierAcceptedAt:null}});
    const note=x.action==="accept"?"Assigned courier accepted the school pickup route.":"Assigned courier declined before pickup. Operations must reassign this request.";
    await tx.scoofooEvent.create({data:{bookingId:b.id,actorId:user.id,status:b.status,note}});
    await schoolNotify(tx,b.guardianId,b.courierId,b.id,"ScooFoo courier "+(x.action==="accept"?"accepted":"declined"),b.reference+": "+note);
    if(x.action==="decline"){const admins=await tx.user.findMany({where:{role:"ADMIN",status:"ACTIVE"},select:{id:true},take:50});if(admins.length)await tx.notification.createMany({data:admins.map(a=>({userId:a.id,title:"ScooFoo reassignment needed",body:b.reference+": courier declined before pickup.",kind:"DELIVERY",entityId:b.id}))});}
    return {saved:true};
   }
   if(x.action==="location"){
    if(!isCourier||!["PICKED_UP","AT_SCHOOL"].includes(b.status))throw new ScoofooError("Location sharing is available to the assigned courier while this tiffin is in transit.",403);
    if(x.latitude===undefined||x.longitude===undefined||x.accuracy===undefined||x.accuracy>100)throw new ScoofooError("Use an accurate location fix within 100 metres.");
    await tx.scoofooBooking.update({where:{id:b.id},data:{latitude:x.latitude,longitude:x.longitude,accuracyMeters:Math.ceil(x.accuracy),locationUpdatedAt:new Date()}});return {saved:true};
   }
   if(x.action==="assign"){
    if(!isAdmin||!x.courierId)throw new ScoofooError("Operations must choose an approved school courier.",403);
    if(!["CONFIRMED","READY"].includes(b.status)||b.school.status!=="APPROVED"||new Date()>=b.pickupDeadline)throw new ScoofooError("Confirm the school and booking before assigning; the pickup deadline must still be open.");
    await lockCourier(tx,x.courierId);
    const courier=await tx.deliveryAgentProfile.findUnique({where:{id:x.courierId},include:{user:true}});
    if(!courier||courier.verificationStatus!=="APPROVED"||courier.user.status!=="ACTIVE")throw new ScoofooError("Choose an approved active courier.");
    if(await tx.delivery.count({where:{agentId:courier.id,status:{notIn:["DELIVERED","FAILED","CANCELLED"]}}}))throw new ScoofooError("This courier has an active Paustik delivery. Use a dedicated available school courier.");
    const other=await tx.scoofooBooking.findMany({where:{courierId:courier.id,id:{not:b.id},status:{in:["CONFIRMED","READY","PICKED_UP","AT_SCHOOL","EXCEPTION"]}}});
    if(other.some(o=>o.schoolId!==b.schoolId||o.serviceDate!==b.serviceDate))throw new ScoofooError("School batches must serve one school on one day.");
    if(other.some(o=>["PICKED_UP","AT_SCHOOL","EXCEPTION"].includes(o.status))||other.length>=3||other.reduce((n,o)=>n+o.boxCount,0)+b.boxCount>courier.mealCapacity)throw new ScoofooError("A school batch can contain up to three home pickups within the courier's carrying capacity; assign it before collections start and resolve any return exceptions.");
    await tx.scoofooBooking.update({where:{id:b.id},data:{courierId:courier.id,courierAcceptedAt:null}});
    await tx.scoofooEvent.create({data:{bookingId:b.id,actorId:user.id,status:b.status,note:"Operations assigned a dedicated school courier and reviewed the pickup route."}});
    await schoolNotify(tx,b.guardianId,courier.id,b.id,"ScooFoo courier assigned",`${b.reference}: home pickup assigned; school reception remains the delivery destination.`);
    return {saved:true};
   }
   if(!schoolTransitionAllowed(b.status,x.action))throw new ScoofooError("Refresh and complete the current school-delivery step first.");
   if(x.action==="confirm"){
    if(!isAdmin)throw new ScoofooError("Only operations can confirm the school route.",403);
    if(b.school.status!=="APPROVED"||!b.school.staffUserIds.length||new Date()>=schoolDateTime(b.serviceDate,b.school.pickupBy))throw new ScoofooError("School reception setup must be approved and pickup must still be possible.");
   }
   if(x.action==="ready"&&(!isGuardian||b.serviceDate!==indiaSchoolDate()||new Date()>=b.pickupDeadline))throw new ScoofooError("Only the parent/preparer can mark food ready on its school day, before the pickup deadline.",403);
   if(["pickup","arrive"].includes(x.action)&&!isCourier)throw new ScoofooError("Assigned approved courier access required.",403);
   if(x.action==="pickup"){
    if(!b.courierAcceptedAt)throw new ScoofooError("Accept the school pickup route before collecting its tiffins.");
    if(await tx.delivery.count({where:{agentId:b.courierId!,status:{notIn:["DELIVERED","CANCELLED","FAILED"]}}}))throw new ScoofooError("Complete ordinary deliveries before this school pickup.");
    if(b.serviceDate!==indiaSchoolDate())throw new ScoofooError("Collect this tiffin only on its booked school day.");
    if(b.school.status!=="APPROVED"||new Date()>=b.pickupDeadline)throw new ScoofooError("Pickup is closed or the school route is paused. Contact operations.");
    if(b.lockedUntil&&b.lockedUntil>new Date())throw new ScoofooError("Too many wrong pickup codes. Wait 15 minutes or contact operations.",429);
    if(!matchesHandoverCode("scoofoo:"+b.id,b.pickupNonce,x.otp??"")){
     const attempts=b.pickupAttempts+1;await tx.scoofooBooking.update({where:{id:b.id},data:{pickupAttempts:attempts,lockedUntil:attempts>=5?new Date(Date.now()+900000):null}});
     return {error:"Pickup code did not match. Ask the parent at handover.",status:attempts>=5?429:400};
    }
   }
   if(x.action==="arrive"&&b.courierId&&await tx.scoofooBooking.count({where:{courierId:b.courierId,serviceDate:b.serviceDate,status:{in:["CONFIRMED","READY"]}}}))throw new ScoofooError("Collect every tiffin in your school batch before reporting school arrival.");
   if(x.action==="receive"&&!b.pickedUpAt)throw new ScoofooError("A tiffin must be collected before school reception can receive it.");
   if(x.action==="returned"&&(!isAdmin||!x.receiverName||x.receiverName.length<2||!x.note||x.note.length<15))throw new ScoofooError("Operations must record the receiving parent/adult and how the return or uncollected closure was confirmed.",403);
   if(x.action==="receive"&&!(isSchool||isAdmin))throw new ScoofooError("Only authorised school reception or operations can record receipt. Couriers cannot confirm their own delivery.",403);
   if(x.action==="receive"&&isAdmin&&(!x.receiverName||x.receiverName.length<2||!x.note||x.note.length<15))throw new ScoofooError("Record the receiving adult and the evidence for this operations receipt.");
   if(x.action==="cancel"&&!(isGuardian||isAdmin))throw new ScoofooError("Only the guardian or operations can cancel before pickup.",403);
   if(x.action==="exception"&&(!isAdmin||!x.note||x.note.length<15))throw new ScoofooError("Operations must record a detailed exception reason.",403);
   const next=({confirm:"CONFIRMED",ready:"READY",pickup:"PICKED_UP",arrive:"AT_SCHOOL",receive:"RECEIVED",cancel:"CANCELLED",exception:"EXCEPTION",returned:"RETURNED"} as Record<string,string>)[x.action];
   const terminal=["RECEIVED","CANCELLED","RETURNED"].includes(next);
   await tx.scoofooBooking.update({where:{id:b.id},data:{status:next,...(x.action==="confirm"?{pickupDeadline:schoolDateTime(b.serviceDate,b.school.pickupBy),arrivalDeadline:schoolDateTime(b.serviceDate,b.school.arriveBy),schoolSnapshot:{name:b.school.name,address:b.school.address,receptionPoint:b.school.receptionPoint,contactName:b.school.contactName,contactPhone:b.school.contactPhone,lunchAt:b.school.lunchAt}}:{}),...(x.action==="pickup"?{pickedUpAt:new Date(),pickupAttempts:0,lockedUntil:null}:{}),...(x.action==="receive"?{receivedAt:new Date(),receivedBy:isAdmin?x.receiverName!:user.name,receiptMethod:isAdmin?"OPERATIONS_RECORDED":"SCHOOL_DESK"}:{}),...(terminal?{latitude:null,longitude:null,accuracyMeters:null,locationUpdatedAt:null,pickupNonce:newHandoverNonce()}:{} )}});
   const note=x.action==="returned"?`Returned / closed by operations. Receiving parent/adult: ${x.receiverName}. ${x.note}`:x.action==="receive"?`Received at school reception by ${isAdmin?x.receiverName:user.name}. ${x.note??"School desk confirmation."}`:x.note??({confirm:"School route confirmed by operations; no online payment taken.",ready:"Parent/preparer confirmed the tiffin is packed and labelled.",pickup:"Home handover verified using the parent's private pickup code.",arrive:"Courier reported arrival at school reception; awaiting adult receipt.",cancel:"Cancelled before pickup. No ScooFoo payment had been collected."} as Record<string,string>)[x.action]??"Operations recorded an exception.";
   await tx.scoofooEvent.create({data:{bookingId:b.id,actorId:user.id,status:next,note}});
   await schoolNotify(tx,b.guardianId,b.courierId,b.id,"ScooFoo · "+next.toLowerCase().replaceAll("_"," "),b.reference+": "+note);
   if(isAdmin)await tx.adminActivityLog.create({data:{adminId:user.id,action:"SCOOFOO_"+x.action.toUpperCase(),entityType:"ScoofooBooking",entityId:b.id,newValue:{status:next,note}}});
   return {saved:true};
  });
  if("error"in result)return NextResponse.json({error:result.error},{status:result.status});
  scheduleEntityPush([x.bookingId]);return NextResponse.json(result);
 }catch(error){if(error instanceof ScoofooError)return NextResponse.json({error:error.message},{status:error.status});return serviceUnavailable();}
}
