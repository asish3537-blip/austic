import { requireRole } from "@/lib/auth";
import "@/app/customer-kitchens.css";

export default async function CustomerRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("CUSTOMER");
  return children;
}
