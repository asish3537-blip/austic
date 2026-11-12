"use client";
import { UiText } from "@/components/ui-language";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
type Wallet = { balance: number; pilot: { enabled: boolean; starterGranted: boolean; starterAmount: number; topUpRemaining: number }; entries: { id: string; direction: string; amount: number; description: string }[] };
export function PilotCustomerWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null); const [amount, setAmount] = useState(100); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const requestId = useRef<string | null>(null); const router = useRouter();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let r = await fetch("/api/customer/wallet", { cache: "no-store" }); let data = await r.json();
        if (!r.ok) throw new Error(data.error || "Wallet could not load.");
        if (data.pilot?.enabled && !data.pilot.starterGranted) {
          const credit = await fetch("/api/customer/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "starter" }) });
          if (!credit.ok) throw new Error("Test credit could not load. Refresh to try again.");
          r = await fetch("/api/customer/wallet", { cache: "no-store" }); data = await r.json(); if (!r.ok) throw new Error(data.error || "Wallet could not load.");
        }
        if (active) setWallet(data);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Wallet could not load."); }
    }
    void load(); const refresh = () => { void load(); }; window.addEventListener("paustik-wallet-updated", refresh); return () => { active = false; window.removeEventListener("paustik-wallet-updated", refresh); };
  }, []);
  async function addCredit() {
    setBusy(true); setMessage(""); setError(""); requestId.current ??= crypto.randomUUID();
    try {
      const r = await fetch("/api/customer/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "topup", amount, requestId: requestId.current }) }); const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not add test credit.");
      requestId.current = null; const fresh = await fetch("/api/customer/wallet", { cache: "no-store" }); if (!fresh.ok) throw new Error("Credit saved. Refresh to load your balance."); setWallet(await fresh.json()); setMessage(d.message); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add credit."); } finally { setBusy(false); }
  }
  return <section className="customer-wallet" id="wallet-section" aria-label="Paustik wallet"><div className="customer-wallet-heading"><div><span className="eyebrow">{wallet?.pilot.enabled ? <UiText text="Pilot test wallet"/> : "Meal day adjustments"}</span><h2><UiText text="Your Paustik wallet"/></h2><p>{wallet?.pilot.enabled ? <UiText text="₹555 starter test credit, plus up to ₹500 extra per account. Test credit is not a cash deposit and cannot be withdrawn. It can be used for pilot meal reservations."/> : "Voluntary cancellations deduct a ₹5 processing fee. Automatic cancellation after a one-hour delivery delay returns the full paid value to your wallet with no cancellation fee."}</p></div><strong aria-label="Wallet balance">{wallet ? `₹${wallet.balance.toFixed(0)}` : <UiText text="Loading…"/>}</strong></div>{wallet?.pilot.enabled && wallet.pilot.topUpRemaining > 0 && <div className="pilot-wallet-topup"><label htmlFor="test-credit">Add test credit · ₹{wallet.pilot.topUpRemaining} available<input id="test-credit" type="number" min={1} max={Math.min(500, wallet.pilot.topUpRemaining)} step={1} value={amount} disabled={busy} onChange={e => { setAmount(Number(e.target.value)); requestId.current = null; }}/></label><button type="button" className="button button-small" disabled={busy || !Number.isInteger(amount) || amount < 1 || amount > wallet.pilot.topUpRemaining} onClick={addCredit}>{busy ? "Adding…" : <UiText text="Add test money"/>}</button><small><UiText text="No real charge or bank transfer."/></small></div>}{wallet?.pilot.enabled && wallet.pilot.topUpRemaining === 0 && <p><UiText text="All ₹500 of extra test credit has been added."/></p>}{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}{wallet?.entries.length ? <ul>{wallet.entries.slice(0, 6).map(entry => <li key={entry.id}><span>{entry.description}</span><b className={entry.direction === "CREDIT" ? "wallet-credit" : "wallet-debit"}>{entry.direction === "CREDIT" ? "+" : "−"}₹{entry.amount.toFixed(0)}</b></li>)}</ul> : <p className="customer-wallet-empty">Your credit and reservation activity will appear here.</p>}</section>;
}
