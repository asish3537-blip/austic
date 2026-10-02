import { requireRole } from "@/lib/auth";
import { DeliveryWorkspace } from "@/components/delivery-workspace";

export default async function DeliveryDashboardPage() {
  const user = await requireRole("DELIVERY_AGENT");
  return <main className="dashboard-shell delivery-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow">Delivery partner workspace</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Accept a ready order, collect it from the kitchen and confirm the customer handover.</p></div></div>
    <DeliveryWorkspace />
  </main>;
}
