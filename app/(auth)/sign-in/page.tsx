import { kitchenId } from "@/lib/kitchen-handoff";
import { AuthPanel } from "@/components/auth-panel";
import { PasswordSignInForm } from "@/components/recovery-forms";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ kitchen?: string | string[] }> }) {
  const kitchen = kitchenId((await searchParams).kitchen);
  return <AuthPanel eyebrow="Secure account access" title="Welcome back to Paustik." description="Sign in to your neighbourhood food account with the email and password you set."><PasswordSignInForm kitchen={kitchen} /></AuthPanel>;
}
