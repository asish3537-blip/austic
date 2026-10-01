"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

function Notice({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={success ? "form-success" : "form-alert"} role={success ? "status" : "alert"}>{children}</div>;
}

export function AdminSignInForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      window.location.assign(result.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  return <>
    <span className="eyebrow">Paustik operations</span><h2>Admin sign in</h2>
    <p className="auth-intro">Use the username and password assigned to you by a Paustik administrator.</p>
    {error && <Notice>{error}</Notice>}
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="admin-username">Username</label><input id="admin-username" name="username" autoComplete="username" minLength={3} maxLength={32} required /></div>
        <div className="field full"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required /><small>Use at least 8 characters.</small></div>
      </div>
      <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in as admin"}<span aria-hidden="true">→</span></button>
    </form>
    <p className="form-footer"><Link className="text-link" href="/sign-in">Back to customer and partner sign in</Link></p>
  </>;
}

