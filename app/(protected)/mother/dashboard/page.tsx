import { PartnerIncomePanel } from "@/components/partner-income-panel";
import { KitchenBrandingEditor } from "@/components/kitchen-branding-editor";
import { UiText } from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import { MotherWorkspace } from "@/components/mother-workspace";

export default async function MotherDashboardPage() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell mother-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow">Mother entrepreneur workspace</span><h1><UiText text="Your kitchen"/></h1></div></div>
    <PartnerIncomePanel role="MOTHER"/>
    <KitchenBrandingEditor />
    <MotherWorkspace />
  </main>;
}
