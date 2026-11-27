import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {normalizeKitchenImage} from "@/lib/kitchen-branding";
import {publicPilotEnabled} from "@/lib/pilot-catalog";
import {ORDER_PHOTO_STAGES,canUploadOrderPhoto,orderPhotoCaption,type OrderPhotoStage} from "@/lib/order-photo-policy";
import type {Prisma} from "@/app/generated/prisma/client";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
const input=z.object({orderId:z.string().uuid(),pilot:z.boolean().default(false),stage:z.enum(ORDER_PHOTO_STAGES),image:z.string().max(280000)});
type Photo={image:string;createdAt:string};
function pilotPhotos(snapshot:unknown):Partial<Record<OrderPhotoStage,Photo>>{if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return{};const value=(snapshot as Record<string,unknown>).photoEvidence;if(!value||typeof value!=="object"||Array.isArray(value))return{};const photos:Partial<Record<OrderPhotoStage,Photo>>={};for(const stage of ORDER_PHOTO_STAGES){const p=(value as Record<string,Photo>)[stage];if(p&&typeof p.image==="string"&&p.image.startsWith("data:image/png;base64,")&&typeof p.createdAt==="string")photos[stage]=p;}return photos;}
function imageResponse(image:string){return new NextResponse(new Uint8Array(Buffer.from(image.slice(22),"base64")),{headers:{...headers,"Content-Type":"image/png","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});}
class PhotoError extends Error{constructor(message:string,public status=409){super(message);}}

export async function GET(request:Request){
 const user=await getCurrentUser();if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to view order photos."},{status:403,headers});
 const query=new URL(request.url).searchParams,orderId=query.get("orderId"),pilot=query.get("pilot")==="1",imageStage=query.get("image");
 if(!z.string().uuid().safeParse(orderId).success||imageStage&&!ORDER_PHOTO_STAGES.includes(imageStage as OrderPhotoStage))return NextResponse.json({error:"Order not found."},{status:404,headers});
 try{
  let photos:Partial<Record<OrderPhotoStage,Photo>>={},status="",paid=false,writable=false;
  if(pilot){if(!publicPilotEnabled())return NextResponse.json({error:"Practice workspace is closed."},{status:403,headers});const order=await prisma.pilotOrder.findFirst({where:{id:orderId!,workspace:{ownerId:user.id}}});if(!order)return NextResponse.json({error:"Order not found."},{status:404,headers});photos=pilotPhotos(order.snapshot);status=order.status;paid=order.paymentStatus==="CAPTURED";writable=true;}
  else{const order=await prisma.order.findFirst({where:{id:orderId!,...(user.role==="ADMIN"?{}:{OR:[{customerId:user.id},{mother:{userId:user.id}},{delivery:{agent:{userId:user.id}}}]})},select:{orderNumber:true,status:true,paymentStatus:true,kitchenId:true,mother:{select:{userId:true}}}});if(!order)return NextResponse.json({error:"Order not found."},{status:404,headers});status=order.status;paid=order.paymentStatus==="CAPTURED";writable=user.role==="MOTHER"&&order.mother.userId===user.id;
   const evidence=await prisma.kitchenEvidence.findMany({where:{kitchenId:order.kitchenId,OR:ORDER_PHOTO_STAGES.map(stage=>({kind:"ORDER_"+stage,caption:orderPhotoCaption(order.orderNumber,stage)}))},select:{kind:true,image:true,createdAt:true}});for(const e of evidence){const stage=e.kind.slice(6) as OrderPhotoStage;photos[stage]={image:e.image,createdAt:e.createdAt.toISOString()};}
  }
  if(imageStage){const photo=photos[imageStage as OrderPhotoStage];return photo?imageResponse(photo.image):new NextResponse(null,{status:404,headers});}
  return NextResponse.json({photos:ORDER_PHOTO_STAGES.filter(stage=>photos[stage]).map(stage=>({stage,createdAt:photos[stage]!.createdAt,url:"/api/order-photos?orderId="+orderId+(pilot?"&pilot=1":"")+"&image="+stage+"&v="+encodeURIComponent(photos[stage]!.createdAt)})),allowed:Object.fromEntries(ORDER_PHOTO_STAGES.map(stage=>[stage,writable&&canUploadOrderPhoto(stage,status,paid)]))},{headers});
 }catch{return serviceUnavailable();}
}

export async function POST(request:Request){
 const blocked=rejectCrossOrigin(request);if(blocked)return blocked;
 const user=await getCurrentUser();if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to upload order photos."},{status:403,headers});
 if(Number(request.headers.get("content-length")||0)>300000)return NextResponse.json({error:"Choose a smaller photo."},{status:413,headers});const raw=await request.text();if(raw.length>300000)return NextResponse.json({error:"Choose a smaller photo."},{status:413,headers});let value:unknown;try{value=JSON.parse(raw);}catch{return NextResponse.json({error:"Choose an order photo."},{status:400,headers});}const parsed=input.safeParse(value);if(!parsed.success)return NextResponse.json({error:"Choose a prepared-meal or handover photo."},{status:400,headers});const x=parsed.data;
 let image:string;try{image=normalizeKitchenImage(x.image,{maxLength:280000,maxDimension:640,maxChunk:210000});}catch{return NextResponse.json({error:"Choose a valid JPG, PNG or WebP with the photo picker."},{status:400,headers});}
 try{
  if(x.pilot){if(!publicPilotEnabled())throw new PhotoError("Practice workspace is closed.",403);await prisma.$transaction(async tx=>{const workspace=await tx.pilotWorkspace.findUnique({where:{ownerId:user.id}});if(!workspace)throw new PhotoError("Order not found.",404);await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"pilot-workspace:"+workspace.id},0))`;const order=await tx.pilotOrder.findFirst({where:{id:x.orderId,workspaceId:workspace.id}});if(!order)throw new PhotoError("Order not found.",404);if(!canUploadOrderPhoto(x.stage,order.status,order.paymentStatus==="CAPTURED"))throw new PhotoError("Add this photo at the preparation or courier-handover step.");const snapshot=order.snapshot as Record<string,Prisma.InputJsonValue>;await tx.pilotOrder.update({where:{id:order.id},data:{snapshot:{...snapshot,photoEvidence:{...pilotPhotos(order.snapshot),[x.stage]:{image,createdAt:new Date().toISOString()}}} as Prisma.InputJsonValue}});});}
  else{if(user.role!=="MOTHER")throw new PhotoError("Only this Mother Kitchen can upload order photos.",403);await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"order-photo:"+x.orderId},0))`;const order=await tx.order.findFirst({where:{id:x.orderId,mother:{userId:user.id}},select:{id:true,orderNumber:true,kitchenId:true,status:true,paymentStatus:true}});if(!order)throw new PhotoError("Order not found.",404);if(!canUploadOrderPhoto(x.stage,order.status,order.paymentStatus==="CAPTURED"))throw new PhotoError("Add this photo at the preparation or courier-handover step.");const where={kitchenId:order.kitchenId,kind:"ORDER_"+x.stage,caption:orderPhotoCaption(order.orderNumber,x.stage)};const existing=await tx.kitchenEvidence.findFirst({where,select:{id:true}});const data={...where,image,uploadedBy:user.id,createdAt:new Date(),reviewStatus:"PENDING",reviewNotes:null,reviewedAt:null,reviewedBy:null};if(existing)await tx.kitchenEvidence.update({where:{id:existing.id},data});else await tx.kitchenEvidence.create({data});await tx.orderEvent.create({data:{orderId:order.id,actorUserId:user.id,status:order.status,detail:x.stage==="PREPARED"?"Mother uploaded the prepared-meal photo.":"Mother uploaded the courier-handover photo."}});});}
  return NextResponse.json({saved:true},{headers});
 }catch(error){if(error instanceof PhotoError)return NextResponse.json({error:error.message},{status:error.status,headers});return serviceUnavailable();}
}
