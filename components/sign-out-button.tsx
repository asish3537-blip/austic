"use client";

import { UiText } from "@/components/ui-language";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      try { const registration = await navigator.serviceWorker?.getRegistration(); const sub = await registration?.pushManager?.getSubscription(); await sub?.unsubscribe(); const shown = await registration?.getNotifications(); shown?.forEach(n => n.close()); } catch { /* Server session revocation still prevents future push dispatch. */ }
      window.dispatchEvent(new Event("paustik-auth-changed")); router.replace("/sign-in"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign out."); setBusy(false); }
  }
  return <><button className="plain-button" type="button" disabled={busy} onClick={signOut}>{busy ? "Signing out…" : <UiText text="Sign out"/>}</button>{error && <small role="alert">{error}</small>}</>;
}
