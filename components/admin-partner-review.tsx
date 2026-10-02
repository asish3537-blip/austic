"use client";

import { useCallback, useEffect, useState } from "react";

type Partner = {
  userId: string; name: string; role: "MOTHER" | "DELIVERY_AGENT"; createdAt: string;
  cuisine: string | null; kitchen: { name: string; location: string; capacityPerDay: number } | null;
  vehicleType: string | null; location: string | null;
};

export function AdminPartnerReview() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/partners", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load partner applications.");
      setPartners(data.partners);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load partner applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function review(partner: Partner, decision: "APPROVE" | "REJECT") {
    setBusyId(partner.userId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/partners", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: partner.userId, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not review this application.");
      setMessage(partner.name + " was " + (decision === "APPROVE" ? "approved" : "declined") + ".");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review this application.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="admin-panel admin-partner-review">
    <div className="admin-section-heading"><div><span className="eyebrow">Partner onboarding</span><h2>Applications to review</h2></div><span className="customer-count">{partners.length}</span></div>
    {message && <p className="workspace-message" role="status">{message}</p>}
    {loading ? <p className="admin-empty-inline">Loading applications…</p> : partners.length ? <div className="admin-partner-list">{partners.map((partner) => <article key={partner.userId}>
      <span className="admin-person-mark" aria-hidden="true">{partner.name.slice(0, 1).toUpperCase()}</span>
      <div className="admin-partner-copy"><strong>{partner.name} · {partner.role === "MOTHER" ? "Mother entrepreneur" : "Delivery partner"}</strong>
        {partner.kitchen ? <span>{partner.kitchen.name} · {partner.kitchen.location} · {partner.cuisine} · capacity {partner.kitchen.capacityPerDay}/day</span> : <span>{partner.vehicleType || "Vehicle not provided"} · {partner.location || "Service area not provided"}</span>}
        <small>Applied {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(partner.createdAt))}</small>
      </div>
      <div className="admin-partner-actions"><button type="button" onClick={() => review(partner, "APPROVE")} disabled={busyId === partner.userId}>{busyId === partner.userId ? "Saving…" : "Approve"}</button><button type="button" onClick={() => review(partner, "REJECT")} disabled={busyId === partner.userId}>Decline</button></div>
    </article>)}</div> : <div className="admin-empty-state"><strong>No partner applications waiting</strong><span>New mother and courier applications will appear here.</span></div>}
  </section>;
}
