
import { getCurrentUser, roleHome } from "@/lib/auth";

import {loadKitchenDirectory} from "@/lib/customer-kitchens";
import {publicPilotEnabled} from "@/lib/pilot-catalog";
import {PublicKitchenBrowser} from "@/components/public-kitchen-browser";
export const dynamic = "force-dynamic";

export default async function BrowsePage({searchParams}:{searchParams:Promise<{city?:string|string[]}>}) {
  const user = await getCurrentUser();

  const query=(await searchParams).city;
  const city=typeof query==="string"&&query.trim()&&query.trim().length<=80?query.trim():"Bhubaneswar";
  let kitchens:Awaited<ReturnType<typeof loadKitchenDirectory>>=[];
  let available=true;
  try{kitchens=await loadKitchenDirectory(city);}catch{available=false;}
  return <PublicKitchenBrowser key={city} kitchens={kitchens} city={city} available={available} practiceEnabled={publicPilotEnabled()} accountHome={user?roleHome(user):undefined} customer={user?.role==="CUSTOMER"}/>;
}
