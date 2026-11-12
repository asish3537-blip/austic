"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated evidence images must bypass public image optimisation. */
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Evidence = { id: string; kind: string; caption: string; licenseNumber: string | null; validUntil: string | null; reviewStatus: string; reviewNotes: string | null; createdAt: string };
type QualityData = {
  kitchens: { id: string; name: string }[];
  kitchen: { id: string; name: string; mother: { fssaiNumber: string | null } } | null;
  evidence: Evidence[];
  inspections: { id: string; inspectedAt: string; status: string; score: string | null; notes: string; correctiveAction: string }[];
  training: { id: string; topic: string; notes: string; dueAt: string; status: string }[];
  feedback: { id: string; mealScore: number | null; deliveryScore: number | null; comment: string; order: { orderNumber: string } }[];
};
const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

export function KitchenQuality({ admin = false }: { admin?: boolean }) {
  const [kitchenId, setKitchenId] = useState("");
  const [data, setData] = useState<QualityData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("PREPARATION");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/kitchen-quality" + (kitchenId ? "?kitchenId=" + kitchenId : ""), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Quality details could not load."); }
  }, [kitchenId]);
  useEffect(() => { const first=setTimeout(()=>void refresh(),0); return()=>clearTimeout(first); }, [refresh]);
  async function post(payload: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/kitchen-quality", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Saved for kitchen quality review."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("photo") as File;
    try {
      if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Choose a PNG, JPG or WebP under 10 MB.");
      const bitmap = await createImageBitmap(file);
      let image: string;
      try {
        const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Photo resizing is unavailable on this device.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        image = canvas.toDataURL("image/png");
      } finally { bitmap.close(); }
      if (image.length > 2800000) throw new Error("This photo is too detailed. Try a smaller image with a clear view of the document or food.");
      await post({ action: "upload", kind, caption: form.get("caption"), image, ...(kind === "FSSAI" ? { licenseNumber: form.get("licenseNumber"), validUntil: form.get("validUntil") } : {}) });
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Upload could not finish."); }
  }
  return <div className="quality-workspace">{message && <p role="status">{message}</p>}{admin && <label>Kitchen<select value={kitchenId || data?.kitchen?.id || ""} onChange={event => setKitchenId(event.target.value)}>{data?.kitchens.map(kitchen => <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>)}</select></label>}{data?.kitchen && <><section className="dashboard-card"><h2>{data.kitchen.name}</h2><p>FSSAI number recorded · <strong>{data.kitchen.mother.fssaiNumber || "Awaiting document review"}</strong></p><p>Photos and licence documents are private to the kitchen account and Paustik administrators. Document approval records an operations review.</p>{!admin && <form className="workspace-form" onSubmit={upload}><label>Evidence type<select value={kind} onChange={event => setKind(event.target.value)}><option value="PREPARATION">Prepared meal / packing photo</option><option value="KITCHEN">Kitchen and hygiene photo</option><option value="FSSAI">FSSAI licence photo</option></select></label><label>Caption and meal/date reference<input name="caption" minLength={5} maxLength={300} required /></label>{kind === "FSSAI" && <><label>14-digit FSSAI number<input name="licenseNumber" inputMode="numeric" pattern="[0-9]{14}" required /></label><label>Licence expiry<input name="validUntil" type="date" required /></label></>}<label>Photo<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required /></label><button className="button" disabled={busy}>Upload for review</button></form>}</section>
      <section className="quality-evidence-grid">{data.evidence.map(evidence => <article className="dashboard-card" key={evidence.id}><a href={"/api/kitchen-quality?imageId=" + evidence.id} target="_blank" rel="noopener noreferrer"><img src={"/api/kitchen-quality?imageId=" + evidence.id} alt={evidence.caption} loading="lazy" /></a><h3>{evidence.kind.replaceAll("_", " ")}</h3><p>{evidence.caption}</p><small>{date(evidence.createdAt)} · {evidence.reviewStatus}</small>{evidence.licenseNumber && <p>{evidence.licenseNumber} · Expires {date(evidence.validUntil!)}</p>}{evidence.reviewNotes && <p>Review · {evidence.reviewNotes}</p>}{admin && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "review", id: evidence.id, status: form.get("status"), notes: form.get("notes") }); }}><label>Decision<select name="status"><option value="APPROVED">Reviewed and approved</option><option value="NEEDS_ACTION">Needs action</option><option value="REJECTED">Rejected</option></select></label><label>Review notes<textarea name="notes" minLength={5} maxLength={1000} required /></label><button className="button button-quiet" disabled={busy}>Record review</button></form>}</article>)}</section>
      <section className="dashboard-card"><h2>Inspections</h2>{admin && <details><summary>Record a completed inspection</summary><form className="workspace-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "inspection", kitchenId: data.kitchen!.id, status: form.get("status"), score: Number(form.get("score")), notes: form.get("notes"), correctiveAction: form.get("correctiveAction"), inspectedAt: new Date(String(form.get("inspectedAt")) + ":00+05:30").toISOString() }); }}><label>Inspection time · IST<input name="inspectedAt" type="datetime-local" required /></label><label>Outcome<select name="status"><option value="PASS">Pass</option><option value="NEEDS_ACTION">Needs action</option><option value="FAIL">Fail</option></select></label><label>Inspection score · 0–100<input name="score" type="number" min={0} max={100} required /></label><label>Evidence and observations<textarea name="notes" minLength={10} maxLength={1500} required /></label><label>Corrective actions<textarea name="correctiveAction" maxLength={1000} /></label><button className="button" disabled={busy}>Save inspection</button></form></details>}{!data.inspections.length && <p>No inspection recorded yet.</p>}{data.inspections.map(inspection => <article key={inspection.id}><strong>{date(inspection.inspectedAt)} · {inspection.status} · {inspection.score}/100</strong><p>{inspection.notes}</p><p>{inspection.correctiveAction}</p></article>)}</section>
      <section className="dashboard-card"><h2>Training & follow-ups</h2>{admin && <details><summary>Assign a training follow-up</summary><form className="workspace-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "training", kitchenId: data.kitchen!.id, topic: form.get("topic"), notes: form.get("notes"), dueAt: new Date(String(form.get("dueAt")) + ":00+05:30").toISOString() }); }}><label>Topic<input name="topic" minLength={4} maxLength={120} required /></label><label>Action and completion evidence<textarea name="notes" minLength={5} maxLength={1000} required /></label><label>Due · IST<input name="dueAt" type="datetime-local" required /></label><button className="button" disabled={busy}>Assign follow-up</button></form></details>}{!data.training.length && <p>No training follow-ups assigned.</p>}{data.training.map(training => <article key={training.id}><h3>{training.topic}</h3><p>{training.notes}</p><small>Due {date(training.dueAt)} · {training.status}</small>{((!admin && training.status === "ASSIGNED") || (admin && training.status === "SUBMITTED")) && <button className="button button-quiet" disabled={busy} onClick={() => void post({ action: "trainingStatus", id: training.id, status: admin ? "COMPLETED" : "SUBMITTED" })}>{admin ? "Confirm completion" : "Submit for completion review"}</button>}</article>)}</section>
      <section className="dashboard-card"><h2>Food & delivery feedback</h2>{!data.feedback.length && <p>No customer ratings recorded yet.</p>}{data.feedback.map(feedback => <article key={feedback.id}><strong>{feedback.order.orderNumber} · {feedback.mealScore ? `Food ${feedback.mealScore}/5` : `Delivery ${feedback.deliveryScore}/5`}</strong><p>{feedback.comment}</p></article>)}</section>
    </>}</div>;
}
