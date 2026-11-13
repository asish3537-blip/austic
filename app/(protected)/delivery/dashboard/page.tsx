import { UiText } from "@/components/ui-language";
import { requireRole } from "@/lib/auth";
import { DeliveryWorkspace } from "@/components/delivery-workspace";

export default async function DeliveryDashboardPage() {
  await requireRole("DELIVERY_AGENT");
  return <main className="dashboard-shell delivery-dashboard">
    <div className="dashboard-head"><div><span className="eyebrow"><UiText text="Delivery partner workspace"/></span><h1><UiText text="Your deliveries"/></h1></div></div>
    <DeliveryWorkspace />
  </main>;
}
