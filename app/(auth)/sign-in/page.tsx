import { kitchenId } from "@/lib/kitchen-handoff";
import { AuthPanel } from "@/components/auth-panel";
import { PasswordSignInForm } from "@/components/recovery-forms";
import { EasySignIn } from "@/components/easy-sign-in";
import { googleClientId } from "@/lib/easy-sign-in";
import { emailConfig } from "@/lib/email";
import {UiText} from "@/components/ui-language";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ kitchen?: string | string[] }> }) {
  const kitchen = kitchenId((await searchParams).kitchen);
  const googleEnabled = Boolean(googleClientId());
  const emailEnabled = Boolean(emailConfig());
  return <AuthPanel eyebrow="Secure account access" title="Welcome back to Paustik." description="Choose an easy way to sign in to your neighbourhood food account.">{(googleEnabled || emailEnabled) && <EasySignIn googleEnabled={googleEnabled} emailEnabled={emailEnabled} kitchen={kitchen} />}<details open={!googleEnabled && !emailEnabled}><summary><UiText text="Use email and password"/></summary><PasswordSignInForm kitchen={kitchen} /></details></AuthPanel>;
}
