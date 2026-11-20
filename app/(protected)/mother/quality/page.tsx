import {UiText} from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import { KitchenQuality } from "@/components/kitchen-quality";
export default async function Page({searchParams}:{searchParams:Promise<{type?:string}>}) {
 const params=await searchParams;
  await requireRole("MOTHER");
  return <main className="dashboard-shell"><span className="eyebrow"><UiText text={"Trust in your kitchen"}/></span><h1><UiText text={"Quality & evidence"}/></h1><KitchenQuality initialKind={params.type==="FSSAI"?"FSSAI":"PREPARATION"}/></main>;
}
