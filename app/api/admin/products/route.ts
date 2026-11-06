import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {productInclude,productRequests,productView} from "@/lib/food-marketplace";
export async function GET(){const u=await getCurrentUser();if(!u||u.role!=="ADMIN"||u.status!=="ACTIVE")return NextResponse.json({error:"Admin access required."},{status:403});const [products,requests]=await Promise.all([prisma.foodProduct.findMany({include:productInclude,orderBy:{createdAt:"desc"},take:100}),productRequests(u)]);return NextResponse.json({products:products.map(productView),requests},{headers:{"Cache-Control":"private, no-store"}});}
