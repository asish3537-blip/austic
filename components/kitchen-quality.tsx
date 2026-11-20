"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated evidence images must bypass public image optimisation. */
import Link from "next/link";
import {UiText,UiDate} from "@/components/ui-language";
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
const date = (value:string) => <UiDate value={value} dateOnly/>;

export function KitchenQuality({ admin = false,initialKind="PREPARATION" }: { admin?: boolean;initialKind?:"PREPARATION"|"FSSAI" }) {
  const [kitchenId, setKitchenId] = useState("");
  const [data, setData] = useState<QualityData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [perpetual,setPerpetual]=useState(false);
  const [kind, setKind] = useState<string>(initialKind);
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
      await post({ action: "upload", kind, caption: form.get("caption"), image, ...(kind === "FSSAI" ? { licenseNumber: form.get("licenseNumber"), perpetual, ...(!perpetual?{validUntil: form.get("validUntil")}: {}) } : {}) });
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Upload could not finish."); }
  }
  return <div className="quality-workspace">{!admin&&<section className="mother-license-entry"><div><strong><UiText text="FSSAI food registration & licence"/></strong><p><UiText text="Starting at home? Follow the guide, apply on FoSCoS, then upload your certificate for review."/></p></div><Link className="button button-quiet" href="/mother-guide"><UiText text="Start your Mother Kitchen"/> →</Link><a className="button" href="https://foscos.fssai.gov.in/" target="_blank" rel="noopener noreferrer"><UiText text="Apply on FoSCoS"/> ↗</a></section>}{message && <p role="status">{message}</p>}{admin && <label><UiText text={"Kitchen"}/><select value={kitchenId || data?.kitchen?.id || ""} onChange={event => setKitchenId(event.target.value)}>{data?.kitchens.map(kitchen => <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>)}</select></label>}{data?.kitchen && <><section className="dashboard-card"><h2>{data.kitchen.name}</h2><p><UiText text={data.kitchen.mother.fssaiNumber?"FSSAI number recorded":"FSSAI certificate status"}/> · <strong>{data.kitchen.mother.fssaiNumber || <UiText text="Awaiting document review"/>}</strong></p><p><UiText text={"Photos and licence documents are private to the kitchen account and Paustik administrators. Document approval records an operations review."}/></p>{!admin && <form className="workspace-form" onSubmit={upload}><label><UiText text={"Evidence type"}/><select value={kind} onChange={event => setKind(event.target.value)}><option value="PREPARATION"><UiText text={"Prepared meal / packing photo"}/></option><option value="KITCHEN"><UiText text={"Kitchen and hygiene photo"}/></option><option value="FSSAI"><UiText text={"FSSAI licence photo"}/></option></select></label><label><UiText text={"Caption and meal/date reference"}/><input name="caption" minLength={5} maxLength={300} required /></label>{kind === "FSSAI" && <><label><UiText text={"14-digit FSSAI number"}/><input name="licenseNumber" inputMode="numeric" pattern="[0-9]{14}" required /></label><label className="license-validity-choice"><input type="checkbox" checked={perpetual} onChange={e=>setPerpetual(e.target.checked)}/><UiText text="Certificate has perpetual validity / no expiry date"/></label>{!perpetual&&<label><UiText text="Expiry date printed on certificate"/><input name="validUntil" type="date" required /></label>}<small><UiText text="Use the validity stated on your certificate. Paustik will review the document before approval."/></small></>}<label><UiText text={"Photo"}/><input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required /></label><button className="button" disabled={busy}><UiText text={"Upload for review"}/></button></form>}</section>
      <section className="quality-evidence-grid">{data.evidence.map(evidence => <article className="dashboard-card" key={evidence.id}><a href={"/api/kitchen-quality?imageId=" + evidence.id} target="_blank" rel="noopener noreferrer"><img src={"/api/kitchen-quality?imageId=" + evidence.id} alt={evidence.caption} loading="lazy" /></a><h3>{evidence.kind.replaceAll("_", " ")}</h3><p>{evidence.caption}</p><small>{date(evidence.createdAt)} · {evidence.reviewStatus}</small>{evidence.licenseNumber && <p>{evidence.licenseNumber} · {evidence.validUntil?<><UiText text="Expires"/> {date(evidence.validUntil)}</>:<UiText text="No expiry date supplied · check certificate"/>}</p>}{evidence.reviewNotes && <p><UiText text={"Review ·"}/>{" "}{evidence.reviewNotes}</p>}{admin && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "review", id: evidence.id, status: form.get("status"), notes: form.get("notes") }); }}><label><UiText text={"Decision"}/><select name="status"><option value="APPROVED"><UiText text={"Reviewed and approved"}/></option><option value="NEEDS_ACTION"><UiText text={"Needs action"}/></option><option value="REJECTED"><UiText text={"Rejected"}/></option></select></label><label><UiText text={"Review notes"}/><textarea name="notes" minLength={5} maxLength={1000} required /></label><button className="button button-quiet" disabled={busy}><UiText text={"Record review"}/></button></form>}</article>)}</section>
      <section className="dashboard-card"><h2><UiText text={"Inspections"}/></h2>{admin && <details><summary><UiText text={"Record a completed inspection"}/></summary><form className="workspace-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "inspection", kitchenId: data.kitchen!.id, status: form.get("status"), score: Number(form.get("score")), notes: form.get("notes"), correctiveAction: form.get("correctiveAction"), inspectedAt: new Date(String(form.get("inspectedAt")) + ":00+05:30").toISOString() }); }}><label><UiText text={"Inspection time · IST"}/><input name="inspectedAt" type="datetime-local" required /></label><label><UiText text={"Outcome"}/><select name="status"><option value="PASS"><UiText text={"Pass"}/></option><option value="NEEDS_ACTION"><UiText text={"Needs action"}/></option><option value="FAIL"><UiText text={"Fail"}/></option></select></label><label><UiText text={"Inspection score · 0–100"}/><input name="score" type="number" min={0} max={100} required /></label><label><UiText text={"Evidence and observations"}/><textarea name="notes" minLength={10} maxLength={1500} required /></label><label><UiText text={"Corrective actions"}/><textarea name="correctiveAction" maxLength={1000} /></label><button className="button" disabled={busy}><UiText text={"Save inspection"}/></button></form></details>}{!data.inspections.length && <p><UiText text={"No inspection recorded yet."}/></p>}{data.inspections.map(inspection => <article key={inspection.id}><strong>{date(inspection.inspectedAt)} · {inspection.status} · {inspection.score}/100</strong><p>{inspection.notes}</p><p>{inspection.correctiveAction}</p></article>)}</section>
      <section className="dashboard-card"><h2><UiText text={"Training & follow-ups"}/></h2>{admin && <details><summary><UiText text={"Assign a training follow-up"}/></summary><form className="workspace-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void post({ action: "training", kitchenId: data.kitchen!.id, topic: form.get("topic"), notes: form.get("notes"), dueAt: new Date(String(form.get("dueAt")) + ":00+05:30").toISOString() }); }}><label><UiText text={"Topic"}/><input name="topic" minLength={4} maxLength={120} required /></label><label><UiText text={"Action and completion evidence"}/><textarea name="notes" minLength={5} maxLength={1000} required /></label><label><UiText text={"Due · IST"}/><input name="dueAt" type="datetime-local" required /></label><button className="button" disabled={busy}><UiText text={"Assign follow-up"}/></button></form></details>}{!data.training.length && <p><UiText text={"No training follow-ups assigned."}/></p>}{data.training.map(training => <article key={training.id}><h3>{training.topic}</h3><p>{training.notes}</p><small><UiText text={"Due"}/>{" "}{date(training.dueAt)} · {training.status}</small>{((!admin && training.status === "ASSIGNED") || (admin && training.status === "SUBMITTED")) && <button className="button button-quiet" disabled={busy} onClick={() => void post({ action: "trainingStatus", id: training.id, status: admin ? "COMPLETED" : "SUBMITTED" })}><UiText text={admin ? "Confirm completion" : "Submit for completion review"}/></button>}</article>)}</section>
      <section className="dashboard-card"><h2><UiText text={"Food & delivery feedback"}/></h2>{!data.feedback.length && <p><UiText text={"No customer ratings recorded yet."}/></p>}{data.feedback.map(feedback => <article key={feedback.id}><strong>{feedback.order.orderNumber} · {feedback.mealScore ? `Food ${feedback.mealScore}/5` : `Delivery ${feedback.deliveryScore}/5`}</strong><p>{feedback.comment}</p></article>)}</section>
    </>}</div>;
}
