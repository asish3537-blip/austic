import { requireRole } from "@/lib/auth";

export default async function CustomerRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("CUSTOMER");
  return children;
}
