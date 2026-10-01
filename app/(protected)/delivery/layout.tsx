import { requireRole } from "@/lib/auth";

export default async function DeliveryRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("DELIVERY_AGENT");
  return children;
}
