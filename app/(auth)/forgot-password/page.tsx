import { AuthPanel } from "@/components/auth-panel";
import { ForgotPasswordForm } from "@/components/recovery-forms";

export default function ForgotPasswordPage() {
  return <AuthPanel eyebrow="We’ll help you get back in" title="Your Pausstik account is here." description="Get a secure reset link by email. You can also continue signing in with your phone code."><ForgotPasswordForm /></AuthPanel>;
}
