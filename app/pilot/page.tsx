import type {Metadata} from "next";
import {getCurrentUser} from "@/lib/auth";
import {publicPilotEnabled,PILOT_KITCHENS} from "@/lib/pilot-catalog";
import {PilotHub} from "@/components/pilot-hub";
import {notFound} from "next/navigation";
export const metadata:Metadata={title:"Practice kitchens · Paustik pilot",robots:{index:false,follow:true}};
export const dynamic="force-dynamic";
export default async function PilotPage({searchParams}:{searchParams:Promise<{kitchen?:string}>}){
 if(!publicPilotEnabled())notFound();
 const [user,params]=await Promise.all([getCurrentUser(),searchParams]);
 const initialKitchen=PILOT_KITCHENS.some(k=>k.id===params.kitchen)?params.kitchen!:PILOT_KITCHENS[0].id;
 return <main className="pilot-hub"><PilotHub authenticated={user?.status==="ACTIVE"} initialKitchen={initialKitchen}/></main>;
}
