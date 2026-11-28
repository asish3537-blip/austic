import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {availableProduct,productInclude} from "@/lib/food-marketplace";
import {canViewProductPhoto,hasProductPhoto} from "@/lib/product-photo";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request){
 const user=await getCurrentUser();
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Sign in to view product photos."},{status:403,headers});
 const id=z.string().uuid().safeParse(new URL(request.url).searchParams.get("productId"));
 if(!id.success)return new NextResponse(null,{status:400,headers});
 try{
  const product=await prisma.foodProduct.findUnique({where:{id:id.data},include:productInclude});
  if(!product)return new NextResponse(null,{status:404,headers});
  const address=user.role==="CUSTOMER"?await prisma.address.findFirst({where:{userId:user.id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}],select:{city:true}}):null;
  if(!canViewProductPhoto(user,{ownerId:product.meal.kitchen.mother.user.id,published:availableProduct(product),city:product.meal.kitchen.city},address?.city))return new NextResponse(null,{status:404,headers});
  if(!hasProductPhoto(product.meal.imageUrl))return new NextResponse(null,{status:404,headers});
  return new NextResponse(Buffer.from(product.meal.imageUrl.slice(22),"base64"),{headers:{...headers,"Content-Type":"image/png","Content-Security-Policy":"default-src 'none'"}});
 }catch{return new NextResponse(null,{status:503,headers});}
}
