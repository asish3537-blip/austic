"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

type AuthenticatorStatus = { enabled: boolean; recoveryCodesRemaining: number };
type SetupDetails = { secret: string; qrCodeDataUrl: string; expiresAt: string };
type AuthenticatorResponse = Partial<AuthenticatorStatus & SetupDetails> & { recoveryCodes?: string[]; error?: string };
type Action = "begin" | "confirm" | "regenerate" | "disable";

async function requestAuthenticator(body?: Record<string, string>, signal?: AbortSignal): Promise<AuthenticatorResponse> {
  const response = await fetch("/api/admin/authenticator", {
    method: body ? "POST" : "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null) as AuthenticatorResponse | null;
  if (!response.ok) throw new Error(result?.error || "Pausstik could not update your security settings. Please try again.");
  if (!result) throw new Error("Pausstik returned an incomplete response. Refresh your security settings and try again.");
  return result;
}

function clearFormSecrets(form: HTMLFormElement) {
  for (const name of ["password", "code"]) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement) input.value = "";
  }
}

function readRecoveryCodes(result: AuthenticatorResponse) {
  if (!Array.isArray(result.recoveryCodes) || !result.recoveryCodes.length || !result.recoveryCodes.every((code) => typeof code === "string")) {
    throw new Error("Your authenticator was updated, but the recovery codes could not be displayed. Refresh this page and create a new set using your authenticator app.");
  }
  return result.recoveryCodes;
}

function readStatus(result: AuthenticatorResponse): AuthenticatorStatus {
  if (typeof result.enabled !== "boolean" || typeof result.recoveryCodesRemaining !== "number") {
    throw new Error("Could not read your authenticator status. Please try again.");
  }
  return { enabled: result.enabled, recoveryCodesRemaining: result.recoveryCodesRemaining };
}

export function AdminAuthenticatorSettings() {
  const [status, setStatus] = useState<AuthenticatorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [setup, setSetup] = useState<SetupDetails | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  async function loadStatus() {
    try {
      setStatus(readStatus(await requestAuthenticator()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your security settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void requestAuthenticator(undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) setStatus(readStatus(result));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load your security settings.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!setup) return;
    const timeout = window.setTimeout(() => {
      setSetup(null);
      setMessage("");
      setError("This setup has expired. Enter your password to create a fresh setup key, then add that key to your app.");
    }, Math.max(0, Date.parse(setup.expiresAt) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [setup]);

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("begin"); setError(""); setMessage("");
    try {
      const request = requestAuthenticator({ action: "begin", password: String(data.get("password") || "") });
      clearFormSecrets(form);
      data.delete("password");
      const result = await request;
      if (!result.secret || !result.qrCodeDataUrl?.startsWith("data:image/png;base64,") || !result.expiresAt || !Number.isFinite(Date.parse(result.expiresAt))) {
        throw new Error("Could not display your setup key. Enter your password and start setup again.");
      }
      setSetup({ secret: result.secret, qrCodeDataUrl: result.qrCodeDataUrl, expiresAt: result.expiresAt });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start authenticator setup.");
    } finally {
      clearFormSecrets(form);
      setBusy(null);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !setup) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("confirm"); setError(""); setMessage("");
    try {
      const request = requestAuthenticator({ action: "confirm", code: String(data.get("code") || "").trim() });
      clearFormSecrets(form);
      const result = await request;
      setSetup(null);
      setStatus({ enabled: true, recoveryCodesRemaining: 0 });
      const codes = readRecoveryCodes(result);
      setRecoveryCodes(codes);
      setCodesSaved(false); setCopyMessage("");
      setStatus({ enabled: true, recoveryCodesRemaining: codes.length });
      setError("");
      setMessage("Your authenticator is linked. Admin sign-in now requires your password and an app code or an unused recovery code.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not confirm that code. Try the current code from your app.");
    } finally {
      setBusy(null);
    }
  }

  async function manage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter instanceof HTMLButtonElement && submitter.value === "disable" ? "disable" : "regenerate";
    const data = new FormData(form);
    setBusy(action); setError(""); setMessage("");
    try {
      const request = requestAuthenticator({ action, password: String(data.get("password") || ""), code: String(data.get("code") || "").trim() });
      clearFormSecrets(form);
      data.delete("password"); data.delete("code");
      const result = await request;
      setSetup(null);
      setRecoveryCodes([]); setCodesSaved(false); setCopyMessage("");
      if (action === "disable") {
        setStatus({ enabled: false, recoveryCodesRemaining: 0 });
        setMessage("Authenticator sign-in is off. Its recovery codes no longer work. You can link an authenticator again below.");
      } else {
        const codes = readRecoveryCodes(result);
        setRecoveryCodes(codes);
        setStatus({ enabled: true, recoveryCodesRemaining: codes.length });
        setMessage("New recovery codes are ready. Your previous recovery codes no longer work.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your authenticator settings.");
    } finally {
      clearFormSecrets(form);
      setBusy(null);
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopyMessage("Recovery codes copied. Save them somewhere private before leaving this page.");
    } catch {
      setCopyMessage("Copy was unavailable. Download the codes or select and copy them manually.");
    }
  }

  function downloadRecoveryCodes() {
    const content = ["Pausstik administrator recovery codes", "Each code can be used once with your admin username and password.", "Keep these private and separate from your phone.", "", ...recoveryCodes].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pausstik-admin-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCopyMessage("Recovery-code download requested. Check that the file was saved before leaving this page.");
  }

  return <section className="admin-panel admin-security-panel" aria-labelledby="authenticator-heading" aria-busy={loading || Boolean(busy)}>
    <div className="admin-security-heading">
      <div><span className="eyebrow">Authenticator app</span><h2 id="authenticator-heading">Protect your admin account</h2></div>
      {status && <span className={`admin-security-badge${status.enabled ? " is-enabled" : ""}`}>{status.enabled ? "Authenticator on" : "Authenticator off"}</span>}
    </div>
    <p className="admin-security-help">Google Authenticator and Microsoft Authenticator both work. Once linked, the app creates a new six-digit code every 30 seconds for your admin sign-in. Customers, mothers and delivery agents continue using SMS or WhatsApp phone verification.</p>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {message && <div className="form-success" role="status">{message}</div>}
    {loading && <p className="admin-security-help" role="status">Loading your security settings…</p>}
    {!loading && !status && <button type="button" className="button button-light" onClick={() => { setLoading(true); setError(""); void loadStatus(); }}>Try again</button>}

    {!loading && status && !status.enabled && !setup && <>
      <p className="admin-security-help">Have your authenticator app ready. Enter your current admin password to create a private setup key, then confirm a code from the app to finish linking it.</p>
      <form className="admin-security-form" onSubmit={begin}>
        <div className="field"><label htmlFor="authenticator-setup-password">Current admin password</label><input id="authenticator-setup-password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required disabled={Boolean(busy)} /></div>
        <div className="admin-security-actions"><button className="button" type="submit" disabled={Boolean(busy)}>{busy === "begin" ? "Preparing setup…" : "Link authenticator app"}</button></div>
      </form>
    </>}

    {setup && <div>
      <ol className="admin-security-steps">
        <li><strong>Open your authenticator app.</strong><p>Choose Add account or the + button, then Scan a QR code. In Microsoft Authenticator, choose Other account.</p></li>
        <li><strong>Scan this private QR code.</strong><p>Keep this setup key private. If you are setting up on the same phone, use the manual key below.</p>
          <Image className="admin-security-qr" src={setup.qrCodeDataUrl} alt="Scan this QR code in your authenticator app to link your Pausstik admin account" width={230} height={230} unoptimized />
          <details className="admin-security-manual"><summary>Enter a setup key manually</summary><p>Choose Enter a setup key in your app, name the account Pausstik admin, and select Time based.</p><code className="admin-security-secret">{setup.secret}</code></details>
          <p className="admin-security-expiry">Complete setup before {new Date(setup.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. An expired setup needs a new key.</p>
        </li>
        <li><strong>Confirm the six-digit code from your app.</strong><p>The authenticator stays off until this code is accepted. If a code is about to change, wait for the next one.</p></li>
      </ol>
      <form className="admin-security-form" onSubmit={confirm}>
        <div className="field"><label htmlFor="authenticator-confirm-code">Six-digit authenticator code</label><input id="authenticator-confirm-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={Boolean(busy)} /></div>
        <div className="admin-security-actions">
          <button className="button" type="submit" disabled={Boolean(busy)}>{busy === "confirm" ? "Confirming…" : "Confirm and turn on"}</button>
          <button className="button button-light" type="button" disabled={Boolean(busy)} onClick={() => { setSetup(null); setError(""); setMessage("Setup dismissed. Authenticator sign-in is still off. Start again when you are ready."); }}>Cancel setup</button>
        </div>
      </form>
    </div>}

    {recoveryCodes.length > 0 && <section className="admin-security-recovery" aria-labelledby="recovery-codes-heading">
      <h3 id="recovery-codes-heading">Save your recovery codes now</h3>
      <p>These codes are shown only here, once. Each replaces one authenticator code when signing in with your password. Store them privately, separate from your phone. They cannot be viewed again after you close this screen.</p>
      <ul className="admin-security-codes" aria-label="One-time recovery codes">{recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
      <div className="admin-security-actions">
        <button className="button button-light" type="button" onClick={() => void copyRecoveryCodes()}>Copy codes</button>
        <button className="button button-light" type="button" onClick={downloadRecoveryCodes}>Download codes</button>
      </div>
      {copyMessage && <p role="status">{copyMessage}</p>}
      <label className="admin-security-save-check"><input type="checkbox" checked={codesSaved} onChange={(event) => setCodesSaved(event.target.checked)} /><span>I have saved these codes somewhere private and can access them if I lose my phone.</span></label>
      <button className="button" type="button" disabled={!codesSaved} onClick={() => { setRecoveryCodes([]); setCodesSaved(false); setCopyMessage(""); setMessage("Recovery codes hidden. Your authenticator is ready for your next admin sign-in."); }}>Done — hide recovery codes</button>
    </section>}

    {!loading && status?.enabled && recoveryCodes.length === 0 && <>
      <p className="admin-security-help">{status.recoveryCodesRemaining} unused recovery {status.recoveryCodesRemaining === 1 ? "code remains" : "codes remain"}. Create a fresh set if you have lost your saved codes. Creating a set replaces every previous recovery code.</p>
      <form className="admin-security-form" onSubmit={manage}>
        <div className="field"><label htmlFor="authenticator-manage-password">Current admin password</label><input id="authenticator-manage-password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required disabled={Boolean(busy)} /></div>
        <div className="field"><label htmlFor="authenticator-manage-code">Authenticator or unused recovery code</label><input id="authenticator-manage-code" name="code" type="text" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} minLength={6} maxLength={64} required disabled={Boolean(busy)} /><small>Your password and one code are needed for either change. Turning off the authenticator also invalidates your recovery codes.</small></div>
        <div className="admin-security-actions">
          <button className="button" type="submit" name="action" value="regenerate" disabled={Boolean(busy)}>{busy === "regenerate" ? "Creating codes…" : "Create new recovery codes"}</button>
          <button className="button admin-security-danger" type="submit" name="action" value="disable" disabled={Boolean(busy)}>{busy === "disable" ? "Turning off…" : "Turn off authenticator"}</button>
        </div>
      </form>
    </>}
  </section>;
}
