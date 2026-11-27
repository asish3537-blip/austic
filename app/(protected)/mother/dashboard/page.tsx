import Link from "next/link";

import { KitchenBrandingEditor } from "@/components/kitchen-branding-editor";
import { UiText } from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import { MotherWorkspace } from "@/components/mother-workspace";

export default async function MotherDashboardPage() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell mother-dashboard">

    <MotherWorkspace />
    <Link className="market-entry" href="/mother/marketplace"><strong><UiText text="Your homemade product shop →"/></strong><span><UiText text="Sattu, sweets & pickles"/></span></Link>
    
    <details className="dashboard-card"><summary><UiText text="Kitchen profile & logo"/></summary><KitchenBrandingEditor /></details>
  </main>;
}
