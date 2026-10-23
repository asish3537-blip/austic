"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AppDemo } from "@/components/app-demo";

type DemoRole = "customer" | "mother" | "courier";
const profiles: Record<DemoRole, string> = {
  customer: "Customer — sample meal discovery",
  mother: "Mother — sample kitchen menu",
  courier: "Delivery agent — sample delivery",
};

export function DemoSignIn() {
  const [role, setRole] = useState<DemoRole>("customer");
  const [challenge, setChallenge] = useState<{ code: string; expires: number; attempts: number } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  function reset() {
    setSignedIn(false); setChallenge(null); setCode(""); setError("");
  }
  function showCode() {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    setChallenge({ code: String(value).padStart(6, "0"), expires: Date.now() + 5 * 60_000, attempts: 0 });
    setCode(""); setError("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) { setError("Choose Show test code first."); return; }
    if (Date.now() >= challenge.expires) { setChallenge(null); setError("That test code expired. Generate a new code."); return; }
    if (code.trim() !== challenge.code) {
      if (challenge.attempts >= 4) { setChallenge(null); setError("Too many attempts. Generate a new test code."); }
      else { setChallenge({ ...challenge, attempts: challenge.attempts + 1 }); setError("Enter the six-digit test code shown above."); }
      return;
    }
    setChallenge(null); setCode(""); setError(""); setSignedIn(true);
  }

  return <main className="app-demo-page">
    <div className="app-demo-hero"><div><span className="eyebrow">Separate demo profiles</span><h1>Try Pausstik without SMS.</h1><p>Use a sample customer, mother or delivery profile. No phone number or email is needed.</p></div></div>
    <div className="app-demo-layout">
      <section className="app-demo-guide" aria-label="Demo sign-in">
        <div className="preview-label">TEST MODE · SAMPLE DATA ONLY</div>
        <h2>{signedIn ? "Your demo is ready" : "Choose your demo profile"}</h2>
        <p>This is a browser-only sign-in simulation. It does not verify identity or create a real account. Sample changes reset when you leave or reload; no real orders, payments or messages are created.</p>
        {signedIn ? <><p role="status">Signed into the {profiles[role].split(" — ")[0].toLowerCase()} demo.</p><button className="button" type="button" onClick={reset}>Leave demo / change role</button></> : <form onSubmit={submit}>
          <div className="field"><label htmlFor="demo-role">Demo profile</label><select id="demo-role" value={role} onChange={(event) => { reset(); setRole(event.target.value as DemoRole); }}>{Object.entries(profiles).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
          <button className="button form-submit" type="button" onClick={showCode}>{challenge ? "Generate a new test code" : "Show test code"}</button>
          {challenge && <><div className="form-success" role="status">Your test code is <strong>{challenge.code}</strong>. Valid for 5 minutes. No SMS was sent.</div><div className="field"><label htmlFor="demo-code">Enter the test code</label><input id="demo-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" /></div><button className="button form-submit" type="submit">Open demo workspace →</button></>}
          {error && <p className="form-alert" role="alert">{error}</p>}
        </form>}
        <p className="form-footer"><Link className="text-link" href="/sign-in">Real account sign in</Link> · <Link className="text-link" href="/admin-sign-in">Protected admin sign in</Link></p>
        <p>Admin accounts remain password and authenticator protected. Demo codes never provide access to existing accounts.</p>
        <Link className="text-link" href="/">Go to website</Link>
      </section>
      {signedIn ? <AppDemo key={role} demoRole={role} /> : <section className="app-demo-guide"><h2>What you can try</h2><ul><li>Customer: sample meals, basket and wallet screens.</li><li>Mother: add dishes to a sample menu and review sample earnings.</li><li>Delivery agent: move a sample delivery through its stages.</li></ul><p>Live database, payment and messaging tests still require a real account.</p></section>}
    </div>
  </main>;
}
