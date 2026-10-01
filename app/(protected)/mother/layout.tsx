import { requireRole } from "@/lib/auth";

export default async function MotherRoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole("MOTHER");
  return children;
}
