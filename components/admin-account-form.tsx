"use client";

import { useState, type FormEvent } from "react";

export function AdminAccountForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), username: data.get("username"), email: data.get("email"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the admin account.");
      form.reset();
      setMessage(result.message || "Admin account created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the admin account. Please try again.");
    } finally { setBusy(false); }
  }

  return <form className="admin-create-form" onSubmit={submit}>
    <div className="form-grid">
      <div className="field"><label htmlFor="new-admin-name">Full name</label><input id="new-admin-name" name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
      <div className="field"><label htmlFor="new-admin-username">Username</label><input id="new-admin-username" name="username" autoComplete="off" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" required /><small>Letters, numbers, dots, underscores or hyphens.</small></div>
      <div className="field full"><label htmlFor="new-admin-email">Email</label><input id="new-admin-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
      <div className="field full"><label htmlFor="new-admin-password">Temporary password</label><input id="new-admin-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /><small>At least 8 characters. Share it with the new admin through a private channel.</small></div>
    </div>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {message && <div className="form-success" role="status">{message}</div>}
    <button className="button form-submit" type="submit" disabled={busy}>{busy ? "Creating…" : "Create admin account"}<span aria-hidden="true">→</span></button>
  </form>;
}

