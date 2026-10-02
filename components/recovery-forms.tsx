"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

function Message({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={success ? "form-success" : "form-alert"} role={success ? "status" : "alert"}>{children}</div>;
}

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Pausstik could not complete that request.");
  return result;
}

export function PasswordSignInForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const result = await readResponse(await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      }));
      window.location.assign(result.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pausstik could not sign you in.");
      setBusy(false);
    }
  }

  return <>
    <span className="eyebrow">Email sign in</span><h2>Use your password</h2>
    <p className="auth-intro">For customer, mother and delivery accounts. Admins should use the admin sign-in page.</p>
    {error && <Message>{error}</Message>}
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="password-login-email">Email address</label><input id="password-login-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
        <div className="field full"><label htmlFor="password-login-password">Password</label><input id="password-login-password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={72} /></div>
      </div>
      <div className="auth-links"><Link className="text-link" href="/forgot-password">Forgot password?</Link><Link className="text-link" href="/sign-in">Use a phone code</Link></div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
    </form>
  </>;
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await readResponse(await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      }));
      setSent(true);
      if (result.error) setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <span className="eyebrow">Account recovery</span><h2>Reset your password</h2>
    <p className="auth-intro">Enter the email on your account. We’ll send a secure link that expires after one hour. Phone-code sign-in remains available.</p>
    {error && <Message>{error}</Message>}
    {sent && <Message success>If the account can receive email, a password reset link is on its way. Check spam too.</Message>}
    <form onSubmit={submit}>
      <div className="form-grid"><div className="field full"><label htmlFor="forgot-email">Email address</label><input id="forgot-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div></div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Email reset link"}<span aria-hidden="true">→</span></button>
    </form>
    <p className="form-footer"><Link className="text-link" href="/password-sign-in">Back to password sign in</Link> · <Link className="text-link" href="/sign-in">Phone code</Link> · <Link className="text-link" href="/admin-sign-in">Admin sign in</Link></p>
  </>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmPassword") || "");
    if (password !== confirmation) {
      setError("The passwords don’t match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await readResponse(await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      }));
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <span className="eyebrow">Account recovery</span><h2>Choose a new password</h2>
    <p className="auth-intro">Use at least 8 characters, including uppercase, lowercase and a number.</p>
    {error && <Message>{error}</Message>}
    {complete ? <Message success>Your password has been changed and other sessions have been signed out. <Link href="/password-sign-in">Sign in with your new password</Link>.</Message> : !token ? <Message>This reset link is incomplete. Request a fresh link and try again.</Message> : <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="reset-password">New password</label><input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></div>
        <div className="field full"><label htmlFor="reset-password-confirm">Confirm password</label><input id="reset-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></div>
      </div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}<span aria-hidden="true">→</span></button>
    </form>}
  </>;
}

export function AdminOwnerSetupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await readResponse(await fetch("/api/auth/admin-bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupCode: data.get("setupCode"),
          name: data.get("name"),
          username: data.get("username"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      }));
      window.location.assign(result.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the admin account.");
      setBusy(false);
    }
  }

  return <>
    <span className="eyebrow">First administrator setup</span><h2>Create the Pausstik owner account</h2>
    <p className="auth-intro">This one-time setup replaces admin access for the recovery. Existing admin records stay in the audit history and their sessions are revoked.</p>
    {error && <Message>{error}</Message>}
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="admin-setup-code">One-time setup code</label><input id="admin-setup-code" name="setupCode" type="password" autoComplete="one-time-code" required minLength={32} maxLength={128} /></div>
        <div className="field"><label htmlFor="owner-name">Full name</label><input id="owner-name" name="name" autoComplete="name" required minLength={2} maxLength={100} /></div>
        <div className="field"><label htmlFor="owner-username">Admin username</label><input id="owner-username" name="username" autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" /></div>
        <div className="field full"><label htmlFor="owner-email">Admin email</label><input id="owner-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
        <div className="field full"><label htmlFor="owner-password">New password</label><input id="owner-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /><small>At least 8 characters with uppercase, lowercase and a number.</small></div>
      </div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create owner account"}<span aria-hidden="true">→</span></button>
    </form>
    <p className="form-footer"><Link className="text-link" href="/admin-sign-in">Back to admin sign in</Link></p>
  </>;
}
