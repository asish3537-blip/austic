import { AuthPanel } from "@/components/auth-panel";
import { ResetPasswordForm } from "@/components/recovery-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthPanel eyebrow="Account recovery" title="A fresh start, securely." description="Choose a new password to continue using Pausstik."><ResetPasswordForm token={token} /></AuthPanel>;
}
