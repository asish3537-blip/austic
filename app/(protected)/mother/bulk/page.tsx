import { requireRole } from "@/lib/auth";
import { BulkBookings } from "@/components/bulk-bookings";
export default async function Page() {
  await requireRole("MOTHER");
  return <main className="dashboard-shell"><span className="eyebrow">Plan your kitchen capacity</span><h1>Bulk bookings</h1><BulkBookings role="MOTHER" /></main>;
}
