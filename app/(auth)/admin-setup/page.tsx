import { OwnerEmailSetup } from "@/components/owner-email-setup";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { AdminOwnerSetupForm } from "@/components/recovery-forms";
import { getCurrentUser } from "@/lib/auth";
import { localAdminPreviewEnabled } from "@/lib/local-admin-preview";

export const dynamic = "force-dynamic";

export default async function AdminOwnerSetupPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN" && user.status === "ACTIVE") redirect("/admin/accounts");
  if (localAdminPreviewEnabled()) return <AuthPanel eyebrow="Local testing" title="Create local admin" description=""><AdminOwnerSetupForm localPreview /></AuthPanel>;
  return <AuthPanel eyebrow="Administrator access" title="Manage administrator access" description="">
    {process.env.PAUSTIK_OWNER_EMAIL && <OwnerEmailSetup />}
    <h2>Administrator access</h2>
    <p className="auth-intro">New administrators are invited by an existing administrator from Accounts &amp; roles.</p>
    <Link className="button" href="/admin-sign-in">Sign in as admin</Link>
    <p className="form-footer"><Link href="/forgot-password">Forgot admin password? Reset by email</Link></p>
    <p className="form-note">Use the email registered to your live admin account. Local test accounts belong to the localhost preview.</p>
  </AuthPanel>;
}

