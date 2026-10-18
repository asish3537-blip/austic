"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

function Notice({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={success ? "form-success" : "form-alert"} role={success ? "status" : "alert"}>{children}</div>;
}

export function AdminSignInForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requiresAuthenticator, setRequiresAuthenticator] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;
    setBusy(true); setError("");
    try {
      const request = fetch("/api/auth/admin-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ username: data.get("username"), password: data.get("password"), authenticatorCode: String(data.get("authenticatorCode") || "").trim() || undefined }),
      });
      if (passwordInput) passwordInput.value = "";
      data.delete("password");
      const response = await request;
      const result = await response.json();
      if (result.requiresAuthenticator) {
        setRequiresAuthenticator(true);
        throw new Error(`${result.error || "Your authenticator code is required."} Enter your password again with the current app code or an unused recovery code.`);
      }
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      window.location.assign(result.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please try again.");
      setBusy(false);
    } finally {
      if (passwordInput) passwordInput.value = "";
      data.delete("password");
    }
  }

  return <>
    <span className="eyebrow">Pausstik operations</span><h2>Admin sign in</h2>
    <p className="auth-intro">Use your admin username and password. If you have linked Google Authenticator or Microsoft Authenticator, enter its current code too.</p>
    {error && <Notice>{error}</Notice>}
    <form onSubmit={submit} aria-busy={busy}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="admin-username">Username</label><input id="admin-username" name="username" autoComplete="username" minLength={3} maxLength={32} required disabled={busy} onChange={() => { setRequiresAuthenticator(false); setError(""); }} /></div>
        <div className="field full"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required disabled={busy} /><small>Use at least 8 characters.</small></div>
        <div className="field full"><label htmlFor="admin-authenticator-code">Authenticator or recovery code{!requiresAuthenticator && " (if linked)"}</label><input id="admin-authenticator-code" name="authenticatorCode" type="text" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} minLength={6} maxLength={64} required={requiresAuthenticator} disabled={busy} aria-describedby="admin-authenticator-help" /><small id="admin-authenticator-help">Your authenticator app creates a new six-digit code every 30 seconds. You can also enter an unused recovery code.</small></div>
      </div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in as admin"}<span aria-hidden="true">→</span></button>
    </form>
    <p className="form-footer"><Link className="text-link" href="/forgot-password">Forgot admin password?</Link></p>
    <p className="form-footer">First-time recovery? <Link className="text-link" href="/admin-setup">Create owner admin account</Link></p>
    <p className="form-footer"><Link className="text-link" href="/sign-in">Back to customer and partner sign in</Link></p>
  </>;
}
