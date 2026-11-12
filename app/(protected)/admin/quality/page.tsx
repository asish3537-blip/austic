import { requireRole } from "@/lib/auth";
import { KitchenQuality } from "@/components/kitchen-quality";
export default async function Page() {
  await requireRole("ADMIN");
  return <main className="console-page"><span className="eyebrow">Kitchen assurance</span><h1>Evidence, inspections & training</h1><KitchenQuality admin /></main>;
}
