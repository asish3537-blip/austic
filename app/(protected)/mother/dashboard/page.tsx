import Link from "next/link";
import { PartnerIncomePanel } from "@/components/partner-income-panel";
import { KitchenBrandingEditor } from "@/components/kitchen-branding-editor";
import { UiText } from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import { MotherWorkspace } from "@/components/mother-workspace";

export default async function MotherDashboardPage() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell mother-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow"><UiText text="Mother entrepreneur workspace"/></span><h1><UiText text="Your kitchen"/></h1></div></div>

    <MotherWorkspace />
    <Link className="market-entry" href="/mother/marketplace"><strong><UiText text="Your homemade product shop →"/></strong><span><UiText text="Sattu, sweets, pickles · product availability and delivery agreements"/></span></Link>
    <details className="dashboard-card"><summary><UiText text="Earnings & planning"/></summary><PartnerIncomePanel role="MOTHER"/></details>
    <details className="dashboard-card"><summary><UiText text="Kitchen profile & logo"/></summary><KitchenBrandingEditor /></details>
  </main>;
}
