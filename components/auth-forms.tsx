"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Role = "CUSTOMER" | "MOTHER" | "DELIVERY_AGENT";

function Alert({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={success ? "form-success" : "form-alert"} role={success ? "status" : "alert"}>{children}</div>;
}

export function SignInForm() {
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");

  async function requestCode() {
    setSending(true); setError(""); setMessage(""); setDevelopmentCode("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send a sign-in code.");
      setCodeSent(true); setMessage(result.message || "If your number has an account, a sign-in code has been sent."); setDevelopmentCode(result.developmentCode || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a sign-in code. Please try again.");
    } finally { setSending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (!codeSent) { setError("Request a phone code first."); setBusy(false); return; }
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: data.get("phone"), otp: data.get("otp") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      window.location.assign(result.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please try again."); setBusy(false);
    }
  }
  return <>
    <span className="eyebrow">Welcome back</span><h2>Sign in to Paustik</h2>
    <p className="auth-intro">Request a one-time code and enter it here. In the current preview, the code appears on this page; no SMS or email is sent.</p>
    {error && <Alert>{error}</Alert>}
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="signin-phone">Phone number</label>
          <div className="phone-otp-row"><input id="signin-phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(event) => { setPhone(event.target.value); setCodeSent(false); setMessage(""); setDevelopmentCode(""); }} required minLength={7} maxLength={24} /><button className="otp-request-button" type="button" onClick={requestCode} disabled={sending || phone.trim().length < 7}>{sending ? "Sending…" : codeSent ? "Send again" : "Send code"}</button></div>
          <small>Indian numbers can use 10 digits or include +91.</small>
        </div>
        {codeSent && <div className="field full"><label htmlFor="signin-otp">6-digit sign-in code</label><input id="signin-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></div>}
      </div>
      {message && <Alert success>{message}{developmentCode && <><br /><strong>Paustik preview code: {developmentCode}</strong></>}</Alert>}
      <div className="auth-links"><span>Preview codes do not verify phone ownership.</span></div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
    </form>
    <p className="form-footer">Administrator? <Link className="text-link" href="/admin-sign-in">Admin sign in</Link></p>
    <p className="form-footer">New to Paustik? <Link className="text-link" href="/sign-up">Create an account</Link></p>
  </>;
}

export function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setMessage(""); setVerificationUrl("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send a verification link.");
      setMessage(result.message || "If the account is eligible, a verification email is on its way.");
      setVerificationUrl(result.verificationUrl || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a verification link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="resend-verification" onSubmit={submit}>
    <div className="field"><label htmlFor="resend-verification-email">Need another verification link?</label><input id="resend-verification-email" name="email" type="email" autoComplete="email" defaultValue={initialEmail} maxLength={254} required /></div>
    {error && <Alert>{error}</Alert>}{message && <Alert success>{message}{verificationUrl && <><br /><Link href={verificationUrl}>Open local verification link</Link></>}</Alert>}
    <button className="plain-button" type="submit" disabled={busy}>{busy ? "Sending…" : "Resend verification email"}</button>
  </form>;
}

const roles: { id: Role; name: string; note: string }[] = [
  { id: "CUSTOMER", name: "Customer", note: "Find meals nearby" },
  { id: "MOTHER", name: "Mother entrepreneur", note: "List your kitchen" },
  { id: "DELIVERY_AGENT", name: "Delivery agent", note: "Deliver locally" },
];

export function SignUpForm() {
  const [role, setRole] = useState<Role>("CUSTOMER");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ message: string; email: string; emailSent: boolean; verificationUrl?: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");

  async function requestCode() {
    setSending(true); setError(""); setMessage(""); setSuccess(null); setDevelopmentCode("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "signup" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send a verification code.");
      setCodeSent(true); setMessage(result.message || "We sent a 6-digit code to your phone."); setDevelopmentCode(result.developmentCode || "");
    } catch (cause) {
      setCodeSent(false);
      setError(cause instanceof Error ? cause.message : "Could not send a verification code. Please try again.");
    } finally { setSending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess(null);
    if (!codeSent) { setError("Send a phone verification code first."); setBusy(false); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(data.entries()), role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create your account.");
      if (result.destination) {
        window.location.assign(result.destination);
        return;
      }
      setSuccess({
        message: result.message || "Your account has been created. Sign in with your phone number.",
        email: String(result.email || data.get("email") || ""),
        emailSent: Boolean(result.emailSent),
        verificationUrl: result.verificationUrl,
      });
      form.reset(); setRole("CUSTOMER"); setPhone(""); setCodeSent(false); setMessage(""); setDevelopmentCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your account. Please try again.");
    } finally { setBusy(false); }
  }
  return <>
    <span className="eyebrow">Join the neighbourhood table</span><h2>Create your account</h2>
    <p className="auth-intro">Choose how you want to take part. This preview shows a temporary code on the page instead of sending SMS or email. Mother and delivery accounts need approval; admin accounts are created only inside the admin panel.</p>
    {error && <Alert>{error}</Alert>}
    {success && <><Alert success>{success.message}{success.verificationUrl && <><br /><Link href={success.verificationUrl}>Verify this development email</Link></>}</Alert>{!success.emailSent && !success.verificationUrl && <ResendVerificationForm initialEmail={success.email} />}<p className="form-footer">Continue to <Link className="text-link" href="/sign-in">sign in with your phone</Link></p></>}
    {!success && <form onSubmit={submit}>
      <div className="role-grid" role="radiogroup" aria-label="Account type">
        {roles.map((item) => <label className="role-option" key={item.id}><input type="radio" name="role-choice" value={item.id} checked={role === item.id} onChange={() => setRole(item.id)} /><span><b>{item.name}</b><small>{item.note}</small></span></label>)}
      </div>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="field"><label htmlFor="signup-name">Full name</label><input id="signup-name" name="name" autoComplete="name" required minLength={2} maxLength={100} /></div>
        <div className="field"><label htmlFor="signup-phone">Phone number</label><div className="phone-otp-row"><input id="signup-phone" name="phone" autoComplete="tel" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(event) => { setPhone(event.target.value); setCodeSent(false); setMessage(""); setDevelopmentCode(""); }} required minLength={7} maxLength={24} /><button className="otp-request-button" type="button" onClick={requestCode} disabled={sending || phone.trim().length < 7}>{sending ? "Sending…" : codeSent ? "Send again" : "Send code"}</button></div><small>Indian numbers can use 10 digits or include +91.</small></div>
        <div className="field full"><label htmlFor="signup-email">Email address for account updates</label><input id="signup-email" name="email" autoComplete="email" type="email" required maxLength={254} /></div>
        {codeSent && <div className="field full"><label htmlFor="signup-otp">6-digit preview code</label><input id="signup-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></div>}
        {role === "MOTHER" && <><div className="field"><label htmlFor="signup-kitchen">Kitchen name</label><input id="signup-kitchen" name="kitchenName" required minLength={2} maxLength={120} /></div><div className="field"><label htmlFor="signup-cuisine">Main cuisine</label><input id="signup-cuisine" name="cuisine" placeholder="e.g. Odia home cooking" required minLength={2} maxLength={80} /></div></>}
        {role === "DELIVERY_AGENT" && <div className="field full"><label htmlFor="signup-vehicle">Vehicle type</label><select id="signup-vehicle" name="vehicleType" required defaultValue=""><option value="" disabled>Select vehicle</option><option>Bicycle</option><option>Scooter</option><option>Motorcycle</option><option>Car</option><option>Other</option></select></div>}
        <div className="field full"><label htmlFor="signup-address">Street address</label><input id="signup-address" name="addressLine1" autoComplete="street-address" required minLength={3} maxLength={160} /></div>
        <div className="field"><label htmlFor="signup-locality">Locality / neighbourhood</label><input id="signup-locality" name="locality" required minLength={2} maxLength={100} /></div>
        <div className="field"><label htmlFor="signup-city">City</label><input id="signup-city" name="city" autoComplete="address-level2" required minLength={2} maxLength={100} /></div>
        <div className="field"><label htmlFor="signup-pin">PIN code</label><input id="signup-pin" name="pinCode" autoComplete="postal-code" required minLength={4} maxLength={12} /></div>
      </div>
      {message && <Alert success>{message}{developmentCode && <><br /><strong>Paustik preview code: {developmentCode}</strong></>}</Alert>}
      <p className="form-note">Preview codes do not verify phone ownership. Your email is collected for future account updates; no email verification is sent in preview mode. Mother and delivery accounts remain pending until reviewed. Admin accounts are created only by an active admin.</p>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}<span aria-hidden="true">→</span></button>
    </form>}
    <p className="form-footer">Already registered? <Link className="text-link" href="/sign-in">Sign in</Link></p>
  </>;
}

export function ForgotPasswordForm() {
  return <><span className="eyebrow">Account recovery</span><h2>No password to reset</h2><p className="auth-intro">Customer and partner accounts use a one-time code. In preview mode it appears in the app; no SMS or email is sent.</p>
    <Link className="button form-submit" href="/sign-in">Continue to phone sign-in</Link>
    <p className="form-footer"><Link className="text-link" href="/sign-up">Create a Paustik account</Link></p></>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  void token;
  return <><span className="eyebrow">Account recovery</span><h2>Use a one-time code</h2><p className="auth-intro">Customer and partner accounts use a one-time code; admin accounts use the password assigned by an administrator.</p><Link className="button form-submit" href="/sign-in">Continue to sign in</Link></>;
}

