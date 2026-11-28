import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {loadCustomerKitchenDiscovery} from "@/lib/customer-kitchens";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const addressInput=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^\+?[0-9 ()-]{7,24}$/),addressLine1:z.string().trim().min(3).max(160),locality:z.string().trim().min(2).max(100),city:z.string().trim().min(2).max(100),pinCode:z.string().trim().regex(/^[0-9A-Za-z -]{4,12}$/),latitude:z.number().min(-90).max(90).nullable(),longitude:z.number().min(-180).max(180).nullable()}).refine(x=>(x.latitude===null)===(x.longitude===null));
export async function GET(){
 const u=await getCurrentUser();if(!u||u.status!=="ACTIVE")return NextResponse.json({error:"Sign in with an active Paustik account."},{status:403,headers});
 if(u.role!=="CUSTOMER")return NextResponse.json({user:{name:u.name,role:u.role,email:u.email},kitchens:[],orders:[]},{headers});
 try{const [discovery,address,orders]=await Promise.all([
  loadCustomerKitchenDiscovery(u.id),
  prisma.address.findFirst({where:{userId:u.id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}],select:{recipientName:true,phone:true,addressLine1:true,locality:true,city:true,pinCode:true,latitude:true,longitude:true}}),
  prisma.order.findMany({where:{customerId:u.id},orderBy:{orderedAt:"desc"},take:50,select:{id:true,orderNumber:true,status:true,paymentStatus:true,scheduledFor:true,totalAmount:true,currency:true,kitchen:{select:{id:true,name:true}},items:{select:{mealName:true,quantity:true}},payments:{where:{status:"PENDING"},select:{amount:true}}}}),
 ]);return NextResponse.json({user:{name:u.name,email:u.email,role:u.role},...discovery,address,orders:orders.map(o=>({...o,total:Number(o.totalAmount),amountDue:o.payments.reduce((n,p)=>n+Number(p.amount),0),items:o.items.map(i=>i.quantity+" × "+i.mealName)}))},{headers});}catch{return serviceUnavailable();}
}
export async function POST(request:Request){
 const denied=rejectCrossOrigin(request);if(denied)return denied;
 const u=await getCurrentUser();if(!u||u.status!=="ACTIVE"||u.role!=="CUSTOMER")return NextResponse.json({error:"Customer sign-in required."},{status:403,headers});
 const raw=await request.text();if(raw.length>4000)return NextResponse.json({error:"Address is too long."},{status:413,headers});let value:unknown;try{value=JSON.parse(raw);}catch{return NextResponse.json({error:"Check your delivery address."},{status:400,headers});}const p=addressInput.safeParse(value);if(!p.success)return NextResponse.json({error:"Check the address, phone and optional delivery coordinates."},{status:400,headers});
 try{await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${"mobile-address:"+u.id},0))`;const current=await tx.address.findFirst({where:{userId:u.id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}],select:{id:true}});const x=p.data,data={recipientName:x.name,phone:x.phone,addressLine1:x.addressLine1,locality:x.locality,city:x.city,pinCode:x.pinCode,latitude:x.latitude,longitude:x.longitude,isDefault:true};if(current)await tx.address.update({where:{id:current.id},data});else await tx.address.create({data:{...data,userId:u.id,label:"Home"}});});return NextResponse.json({saved:true},{headers});}catch{return serviceUnavailable();}
}
