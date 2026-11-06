import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {rejectCrossOrigin,serviceUnavailable} from "@/lib/http";
import {normalizeKitchenImage} from "@/lib/kitchen-branding";
import {isLocalAuthMode} from "@/lib/local-auth-mode";
export const dynamic="force-dynamic";
const select={name:true,email:true,phone:true,role:true,avatarImage:true};
const schema=z.object({name:z.string().trim().min(2).max(80).optional(),avatarImage:z.string().max(280000).nullable().optional()}).strict().refine(x=>x.name!==undefined||x.avatarImage!==undefined);
export async function GET(){const u=await getCurrentUser();if(!u||u.status!=="ACTIVE")return NextResponse.json({error:"Sign in to view your profile."},{status:403});if(isLocalAuthMode())return NextResponse.json({profile:{name:u.name,email:u.email,role:u.role,phone:null,avatarImage:null},preview:true},{headers:{"Cache-Control":"private, no-store"}});try{return NextResponse.json({profile:await prisma.user.findUnique({where:{id:u.id},select})},{headers:{"Cache-Control":"private, no-store"}});}catch{return serviceUnavailable();}}
export async function POST(req:Request){const blocked=rejectCrossOrigin(req);if(blocked)return blocked;const u=await getCurrentUser();if(!u||u.status!=="ACTIVE")return NextResponse.json({error:"Sign in to update your profile."},{status:403});if(isLocalAuthMode())return NextResponse.json({error:"Profile editing requires your connected account."},{status:409});if(Number(req.headers.get("content-length")||0)>300000)return NextResponse.json({error:"Image is too large."},{status:413});const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Enter a name of 2–80 characters and choose a valid photo."},{status:400});let avatarImage=p.data.avatarImage;try{if(avatarImage)avatarImage=normalizeKitchenImage(avatarImage);}catch{return NextResponse.json({error:"Choose a PNG, JPG or WebP using the photo picker."},{status:400});}try{const profile=await prisma.user.update({where:{id:u.id},data:{...(p.data.name!==undefined?{name:p.data.name}:{}),...(avatarImage!==undefined?{avatarImage}:{})},select});return NextResponse.json({profile,message:"Profile saved."});}catch{return serviceUnavailable();}}
