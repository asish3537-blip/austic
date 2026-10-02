import { AuthPanel } from "@/components/auth-panel";
import { PasswordSignInForm } from "@/components/recovery-forms";

export default function PasswordSignInPage() {
  return <AuthPanel eyebrow="Secure account access" title="Welcome back to Pausstik." description="Sign in to your neighbourhood food account with the email and password you set."><PasswordSignInForm /></AuthPanel>;
}
