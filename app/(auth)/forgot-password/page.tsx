import { AuthPanel } from "@/components/auth-panel";
import { ForgotPasswordForm } from "@/components/auth-forms";

export default function ForgotPasswordPage() {
  return <AuthPanel eyebrow="We’ll help you get back in" title="Your Paustik account is here." description="Get back into your account with a one-time code sent to your phone."><ForgotPasswordForm /></AuthPanel>;
}
