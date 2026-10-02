import { AuthPanel } from "@/components/auth-panel";
import { AdminSignInForm } from "@/components/admin-auth-forms";

export default function AdminSignInPage() {
  return <AuthPanel eyebrow="Pausstik operations" title="A clear view of every moving part." description="Sign in with the administrator credentials assigned to your account."><AdminSignInForm /></AuthPanel>;
}
