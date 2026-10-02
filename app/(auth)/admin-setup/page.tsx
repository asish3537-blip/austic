import { AuthPanel } from "@/components/auth-panel";
import { AdminOwnerSetupForm } from "@/components/recovery-forms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOwnerSetupPage() {
  if (process.env.DATABASE_URL) {
    try {
      const completed = await prisma.adminActivityLog.findFirst({
        where: { action: "ADMIN_OWNER_BOOTSTRAP" },
        select: { id: true },
      });
      if (completed) {
        return <AuthPanel eyebrow="Setup complete" title="Admin recovery is closed." description="Use the admin panel to create additional administrator accounts.">
          <p className="auth-intro">The one-time owner setup has already been used. Sign in with the Pausstik admin account.</p>
          <a className="button" href="/admin-sign-in">Go to admin sign in</a>
        </AuthPanel>;
      }
    } catch {
      // Keep the recovery form available; its API provides the authoritative error.
    }
  }
  return <AuthPanel eyebrow="Restricted setup" title="Set up Pausstik operations." description="The one-time recovery code is required. After this account is created, administrators are managed from the admin panel."><AdminOwnerSetupForm /></AuthPanel>;
}
