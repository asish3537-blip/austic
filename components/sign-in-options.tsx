import Link from "next/link";

export function SignInOptions({ signup = false }: { signup?: boolean }) {
  return <section className="signin-options" aria-label="Available sign-in options">
    <h3>{signup ? "Before you create an account" : "Choose how to continue"}</h3>
    <p><strong>SMS & WhatsApp: activation pending.</strong> Phone codes are not currently available. New account registration still requires phone verification and email confirmation.</p>
    <div className="signin-option-actions"><Link className="button" href="/password-sign-in">Existing account · Email & password</Link><Link className="button button-light" href="/demo-sign-in">Try a demo · Code on screen</Link></div>
    <p>Email sign-in is for existing accounts with a password. <Link href="/forgot-password">Set or reset your password</Link> using your account email; the reset link requires email delivery.</p>
    <small>Demo profiles use temporary sample data. They do not create real accounts or orders. Administrators use <Link href="/admin-sign-in">protected admin sign-in</Link>.</small>
  </section>;
}
