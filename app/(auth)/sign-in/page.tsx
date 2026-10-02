import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/auth-forms";

export default function SignInPage() {
  return <AuthPanel eyebrow="Meals made with care" title="Welcome to a better table." description="Sign in to follow your Pausstik journey, whether you’re ordering, cooking or delivering."><SignInForm /></AuthPanel>;
}
