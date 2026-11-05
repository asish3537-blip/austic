"use client";

import { UiText } from "@/components/ui-language";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function signOut() {
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { window.dispatchEvent(new Event("paustik-auth-changed")); router.replace("/sign-in"); router.refresh(); }
  }
  return <button className="plain-button" type="button" disabled={busy} onClick={signOut}>{busy ? "Signing out…" : <UiText text="Sign out"/>}</button>;
}
