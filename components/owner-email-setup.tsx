"use client";
import { useState, type FormEvent } from "react";
export function OwnerEmailSetup() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/auth/admin-recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json(); setMessage(r.ok ? d.message : d.error || "Could not send the setup link.");
    } catch { setMessage("Connection failed. Please try again."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}><h2>Set up owner access</h2><p className="auth-intro">Enter your configured owner email. Open the email link to choose your password, then sign in as admin using that email.</p><div className="field"><label htmlFor="owner-recovery-email">Owner email</label><input id="owner-recovery-email" name="email" type="email" required autoComplete="email" maxLength={254} /></div>{message && <p role="status">{message}</p>}<button className="button form-submit" disabled={busy}>{busy ? "Sending…" : "Email admin setup link"}</button></form>;
}

