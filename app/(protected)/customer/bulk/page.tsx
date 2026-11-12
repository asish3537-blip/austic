import { requireRole } from "@/lib/auth";
import { BulkBookings } from "@/components/bulk-bookings";
export default async function Page() {
  await requireRole("CUSTOMER");
  return <main className="dashboard-shell"><span className="eyebrow">Meals for your group</span><h1>Bulk bookings</h1><BulkBookings role="CUSTOMER" /></main>;
}
