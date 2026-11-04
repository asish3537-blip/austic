import { LocalEmailNotice } from "@/components/local-email-notice";
import { AuthPanel } from "@/components/auth-panel";
import { SignUpForm } from "@/components/auth-forms";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const role = (await searchParams).role;
  return <AuthPanel eyebrow="" title="Create an account" description=""><LocalEmailNotice /><SignUpForm initialRole={role === "MOTHER" || role === "DELIVERY_AGENT" ? role : "CUSTOMER"} /></AuthPanel>;
}
