"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UiText } from "@/components/ui-language";
export function HeaderAccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", {signal:controller.signal, cache:"no-store"}).then(r => { if(r.ok) return r.json(); return null; }).then(data => setSignedIn(Boolean(data?.user))).catch(() => {});
    return () => controller.abort();
  }, []);
  return <Link className="header-account-entry" href={signedIn?"/app":"/sign-in"}><UiText text={signedIn?"Open app":"Sign in"}/></Link>;
}
