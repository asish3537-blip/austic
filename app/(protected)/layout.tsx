import { requireAuthenticatedUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuthenticatedUser();
  return <>
    <div className="dashboard-topline"><span>{user.name} <span className="muted">· {user.role.replaceAll("_", " ").toLowerCase()}</span></span><SignOutButton /></div>
    {children}
  </>;
}
