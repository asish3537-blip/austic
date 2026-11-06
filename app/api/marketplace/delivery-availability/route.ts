import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {hasOnlineCourier,NO_COURIER_MESSAGE} from "@/lib/delivery-availability";
export async function GET(req:Request){
 const user=await getCurrentUser();
 if(!user||user.role!=="CUSTOMER"||user.status!=="ACTIVE")return NextResponse.json({error:"Customer access required."},{status:403});
 const id=new URL(req.url).searchParams.get("menuId");
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Choose a menu."},{status:400});
 try{
  const menu=await prisma.menu.findUnique({where:{id},select:{isAvailable:true,kitchen:{select:{city:true,latitude:true,longitude:true,isAcceptingOrders:true,verificationStatus:true}}}});
  if(!menu||!menu.isAvailable||!menu.kitchen.isAcceptingOrders||menu.kitchen.verificationStatus!=="APPROVED")return NextResponse.json({available:false,message:"This menu is currently unavailable."},{headers:{"Cache-Control":"private, no-store"}});
  const available=await hasOnlineCourier(menu.kitchen);
  return NextResponse.json({available,message:available?"A delivery partner is online. Availability is checked again when you book.":NO_COURIER_MESSAGE},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Could not check delivery availability. Please refresh."},{status:503});}
}
