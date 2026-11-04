import { requireRole } from "@/lib/auth";
import { MotherWorkspace } from "@/components/mother-workspace";

export default async function MotherDashboardPage() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell mother-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow">Mother entrepreneur workspace</span><h1>Your kitchen</h1></div></div>
    <MotherWorkspace />
  </main>;
}
