import { requireRole } from "@/lib/auth";
import { BulkBookings } from "@/components/bulk-bookings";
export default async function Page() {
  await requireRole("ADMIN");
  return <main className="console-page"><span className="eyebrow">Arranged transport</span><h1>Bulk dispatch</h1><BulkBookings role="ADMIN" /></main>;
}
