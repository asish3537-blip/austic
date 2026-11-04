import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const user = await getCurrentUser();
  if (user) redirect(isLocalAuthMode() ? "/account/local-demo" : roleHome(user));
  return <main className="entry-card"><span className="eyebrow">Pausstik app</span>
    <h1>Your neighbourhood table.</h1><p>Sign in to order meals or manage your work.</p>
    <div className="hero-actions"><Link className="button" href="/sign-in">Sign in</Link><Link className="button button-light" href="/sign-up">Create account</Link></div>
    <p className="entry-links"><Link href="/admin-sign-in">Admin sign-in</Link> · <Link href="/help">Help</Link> · <Link href="/">Go to website</Link></p>
  </main>;
}
