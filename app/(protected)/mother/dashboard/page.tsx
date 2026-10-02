import { requireRole } from "@/lib/auth";
import { MotherWorkspace } from "@/components/mother-workspace";

export default async function MotherDashboardPage() {
  const user = await requireRole("MOTHER");
  return <main className="dashboard-shell mother-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow">Mother entrepreneur workspace</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Manage your kitchen, publish this week’s meals and move customer orders through preparation.</p></div></div>
    <MotherWorkspace />
  </main>;
}
