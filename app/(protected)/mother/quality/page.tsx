import { requireRole } from "@/lib/auth";
import { KitchenQuality } from "@/components/kitchen-quality";
export default async function Page() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell"><span className="eyebrow">Trust in your kitchen</span><h1>Quality & evidence</h1><KitchenQuality /></main>;
}
