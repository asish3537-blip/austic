import { requireRole } from "@/lib/auth";

export default async function AdminRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("ADMIN");
  return children;
}
