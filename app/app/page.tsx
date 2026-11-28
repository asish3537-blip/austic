import {redirect} from "next/navigation";
import {getCurrentUser,roleHome} from "@/lib/auth";
import {isLocalAuthMode} from "@/lib/local-auth-mode";
export const dynamic="force-dynamic";
export default async function AppEntryPage(){
 const user=await getCurrentUser();
 redirect(user?(isLocalAuthMode()?"/account/local-demo":roleHome(user)):"/browse");
}
