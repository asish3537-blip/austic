import { AuthPanel } from "@/components/auth-panel";
import { ResetPasswordForm } from "@/components/auth-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthPanel eyebrow="Account recovery" title="A fresh start, securely." description="Choose a new password to continue using Paustik."><ResetPasswordForm token={token} /></AuthPanel>;
}
