import { kitchenId } from "@/lib/kitchen-handoff";
import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/auth-forms";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ kitchen?: string | string[] }> }) {
  const kitchen = kitchenId((await searchParams).kitchen);
  return <AuthPanel eyebrow="Meals made with care" title="Welcome to a better table." description="Sign in to follow your Pausstik journey, whether you’re ordering, cooking or delivering."><SignInForm kitchen={kitchen} /></AuthPanel>;
}
