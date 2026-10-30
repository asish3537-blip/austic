import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const user = await getCurrentUser();
  if (user) redirect(isLocalAuthMode() ? "/account/local-demo" : roleHome(user));
  return <main className="app-demo-page">
    <div className="app-demo-hero"><div><span className="eyebrow">Welcome to Pausstik</span><h1>Good food. Close to home.</h1><p>Find your neighbourhood kitchen, manage your meals, or open your partner workspace.</p></div></div>
    <section className="signin-options" aria-label="Open your workspace"><h2>How would you like to continue?</h2><div className="signin-option-actions">
      <Link className="button" href="/password-sign-in">Sign in with email & password</Link>
      <Link className="button button-light" href="/demo-sign-in">Try customer, mother or delivery demo</Link>
      <Link className="text-link" href="/sign-up">Create an account · See availability</Link>
      <Link className="text-link" href="/admin-sign-in">Admin sign-in</Link>
    </div><p>SMS and WhatsApp codes are awaiting activation. Existing accounts can use email and password. Demo profiles show a test code on screen and use temporary sample data.</p><Link href="/forgot-password">Set or reset your account password</Link></section>
    <section className="app-demo-guide"><h2>Know before you start</h2><p><strong>Delivery navigation:</strong> assigned couriers can open kitchen and customer routes in Google Maps from their delivery workspace.</p><p><strong>Payments:</strong> online checkout is not connected yet. Follow the agreed pilot collection method; demo actions never charge money.</p><p><Link href="/help">Help & guides</Link> · <Link href="/install">Installation help</Link></p></section>
    <p className="form-footer"><Link className="button button-light" href="/">Go to website →</Link></p>
  </main>;
}
