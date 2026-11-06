import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getProductCatalog} from "@/lib/food-marketplace";
export async function GET(){const u=await getCurrentUser();if(!u||u.role!=="CUSTOMER"||u.status!=="ACTIVE")return NextResponse.json({error:"Customer access required."},{status:403});return NextResponse.json(await getProductCatalog(u.id),{headers:{"Cache-Control":"private, no-store"}});}
