import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const verified = state === "verified";
  return <AuthPanel eyebrow="Paustik account security" title={verified ? "Email confirmed." : "This link needs a refresh."} description={verified ? "Your email address is verified. You can sign in to Paustik now." : "The verification link may have expired or already been used. Sign in or ask for a fresh link."}>
    <span className="eyebrow">Email verification</span>
    <h2>{verified ? "You’re ready to sign in" : "We couldn’t verify that link"}</h2>
    <p className="auth-intro">{verified ? "Your account email is confirmed." : "Verification links expire after 24 hours and can only be used once."}</p>
    <Link className="button" href="/sign-in">Go to sign in</Link>
  </AuthPanel>;
}
