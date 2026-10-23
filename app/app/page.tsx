import { redirect } from "next/navigation";
import { requireAuthenticatedUser, roleHome } from "@/lib/auth";
import { isLocalAuthMode } from "@/lib/local-auth-mode";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const user = await requireAuthenticatedUser();
  redirect(isLocalAuthMode() ? "/account/local-demo" : roleHome(user));
}
