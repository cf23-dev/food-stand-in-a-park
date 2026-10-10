"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, EmptyState } from "./ui";
import { HOUR_STATUS_LABELS, formatHours, formatServiceDate, hourCommandSchema, localDate, type HourEntry, type HourStatus } from "@/lib/hours";

export type CompletedHourPickup = { id: string; completed_at: string; pickup: { food_type: string; address: string } | null };
export function HourBadge({ status }: { status: HourStatus }) {
  const styles = { draft: "bg-gray-100 text-gray-700", pending: "bg-amber-100 text-amber-800",
    returned: "bg-blue-100 text-blue-800", signed: "bg-brand-100 text-brand-800" };
  return <span className={`badge ${styles[status]}`}>{HOUR_STATUS_LABELS[status]}</span>;
}
export async function sendHourCommand(command: unknown) {
  const res = await fetch("/api/hours", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not save. Please try again.");
  return data.entry as HourEntry;
}
export function VolunteerHours({ entries, pickups, loadError, prefill, onPrefillUsed }: {
  entries: HourEntry[]; pickups: CompletedHourPickup[]; loadError?: string; prefill?: string | null; onPrefillUsed: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<HourEntry | "new" | null>(prefill ? "new" : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<HourStatus | "all">("all");
  async function act(entry: HourEntry, action: "request" | "withdraw" | "delete") {
    if (action === "delete" && !window.confirm("Delete this unsigned hour entry?")) return;
    setBusy(entry.id); setError(null); setMessage(null);
    try {
      await sendHourCommand({ action, id: entry.id, version: entry.version });
      setMessage(action === "request" ? "Signature requested. An admin will review your hours." : action === "withdraw" ? "Request withdrawn. You can edit your hours." : "Hour entry deleted.");
      router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  }
  const total = (status?: HourStatus) => entries.filter(e => !status || e.status === status).reduce((sum, e) => sum + e.duration_minutes, 0);
  return <section className="space-y-5" aria-label="Hours and signatures">
    <div className="flex flex-wrap items-center justify-between gap-3"><div>
      <h2 className="text-xl font-semibold">Hours &amp; signatures</h2>
      <p className="text-sm text-gray-600">Log your service and request an admin signature for your volunteer requirements.</p>
    </div><button className="btn-primary" disabled={!!loadError || !!busy} onClick={() => { onPrefillUsed(); setEditing("new"); setMessage(null); }}>Log hours</button></div>
    {loadError && <Alert>{loadError}</Alert>}
    {error && <Alert>{error}</Alert>}{message && <Alert kind="success">{message}</Alert>}
    <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-gray-200 py-4">
      {[["Total logged", total()], ["Awaiting signature", total("pending")], ["Signed hours", total("signed")]].map(([label, minutes]) =>
        <div key={String(label)}><dt className="text-sm text-gray-600">{label}</dt><dd className="text-2xl font-semibold">{formatHours(Number(minutes))}</dd></div>)}
    </dl>
    {editing && <HourForm key={editing === "new" ? `new-${prefill ?? ""}` : editing.id} entry={editing === "new" ? undefined : editing}
      prefill={prefill} pickups={pickups} entries={entries} onCancel={() => { setEditing(null); onPrefillUsed(); }}
      onSaved={submitted => { setEditing(null); onPrefillUsed(); setMessage(submitted ? "Signature requested. An admin will review your hours." : "Draft saved."); router.refresh(); }} />}
    <label className="label max-w-xs">Show entries<select className="input mt-1" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
      <option value="all">All entries</option>{Object.entries(HOUR_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    {!loadError && entries.filter(e => filter === "all" || e.status === filter).length === 0 &&
      <EmptyState title={entries.length ? "No entries with this status" : "Your service hours start here"}
        body={entries.length ? "Choose another status to see your entries." : "Choose Log hours, add your service details, and request a signature when you’re ready."} />}
    <div className="space-y-3">{entries.filter(e => filter === "all" || e.status === filter).map(entry => <article key={entry.id} className="card">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{entry.activity}</h3>
        <p className="text-sm text-gray-600">{formatServiceDate(entry.service_date)} · {formatHours(entry.duration_minutes)}{entry.program && ` · ${entry.program}`}</p>
        {entry.claim_id && <p className="mt-1 text-sm text-gray-600">Linked to a completed pickup</p>}
      </div><HourBadge status={entry.status} /></div>
      {entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{entry.notes}</p>}
      {entry.review_note && entry.status !== "signed" && <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">Reviewer feedback: {entry.review_note}</p>}
      {entry.status === "signed" && <p className="mt-2 text-sm text-gray-600">Signed by {entry.signer_name}, {entry.signer_title}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(entry.status === "draft" || entry.status === "returned") && <>
          <button className="btn-primary" disabled={!!busy} onClick={() => act(entry, "request")}>Request signature</button>
          <button className="btn-secondary" disabled={!!busy} onClick={() => { onPrefillUsed(); setEditing(entry); }}>Edit</button>
          <button className="btn-secondary" disabled={!!busy} onClick={() => act(entry, "delete")}>Delete</button>
        </>}
        {entry.status === "pending" && <button className="btn-secondary" disabled={!!busy} onClick={() => act(entry, "withdraw")}>Withdraw to edit</button>}
        {entry.status === "signed" && <a className="btn-primary" href={`/volunteer/hours/${entry.id}`} target="_blank" rel="noopener noreferrer">View signed record</a>}
        {busy === entry.id && <span role="status" className="self-center text-sm text-gray-600">Saving…</span>}
      </div>
    </article>)}</div>
  </section>;
}

function HourForm({ entry, prefill, pickups, entries, onCancel, onSaved }: {
  entry?: HourEntry; prefill?: string | null; pickups: CompletedHourPickup[]; entries: HourEntry[]; onCancel: () => void; onSaved: (submitted: boolean) => void;
}) {
  const initial = pickups.find(p => p.id === (entry?.claim_id ?? prefill));
  const [id] = useState(() => entry?.id ?? crypto.randomUUID());
  const [date, setDate] = useState(entry?.service_date ?? (initial ? localDate(new Date(initial.completed_at)) : localDate()));
  const [hours, setHours] = useState(String(Math.floor((entry?.duration_minutes ?? 0) / 60)));
  const [minutes, setMinutes] = useState(String((entry?.duration_minutes ?? 0) % 60));
  const [activity, setActivity] = useState(entry?.activity ?? (initial ? `Food pickup: ${initial.pickup?.food_type ?? "Delivery"}` : ""));
  const [claim, setClaim] = useState(entry?.claim_id ?? prefill ?? "");
  const [program, setProgram] = useState(entry?.program ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(submit: boolean) {
    if (busy) return;
    setError(null);
    if (!/^\d+$/.test(hours) || !/^\d+$/.test(minutes) || Number(minutes) > 59) { setError("Enter whole hours and minutes (0–59 minutes)."); return; }
    if (date > localDate()) { setError("Service date cannot be in the future."); return; }
    const command = { action: entry ? "save" : "create", id, version: entry?.version, submit,
      service_date: date, duration_minutes: Number(hours) * 60 + Number(minutes), activity, claim_id: claim || null, notes, program };
    const parsed = hourCommandSchema.safeParse(command);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try { await sendHourCommand(parsed.data); onSaved(submit); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <form className="card space-y-4" onSubmit={e => { e.preventDefault(); save(true); }}>
    <h3 className="font-semibold">{entry ? "Edit service hours" : "Log service hours"}</h3>
    {error && <Alert>{error}</Alert>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="label">Service date<input className="input mt-1" type="date" required max={localDate()} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="label">Hours<input className="input mt-1" type="number" min="0" max="24" step="1" required value={hours} onChange={e => setHours(e.target.value)} /></label>
        <label className="label">Minutes<input className="input mt-1" type="number" min="0" max="59" step="1" required value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
      </div>
      <label className="label">Completed pickup (optional)<select className="input mt-1" value={claim} onChange={e => {
        setClaim(e.target.value); const pickup = pickups.find(p => p.id === e.target.value);
        if (pickup) { setActivity(`Food pickup: ${pickup.pickup?.food_type ?? "Delivery"}`); setDate(localDate(new Date(pickup.completed_at))); }
      }}><option value="">Other service for Food Stand in a Park</option>{pickups.filter(p => !entries.some(e => e.claim_id === p.id && e.id !== entry?.id)).map(p =>
        <option key={p.id} value={p.id}>{p.pickup?.food_type ?? "Pickup"} · {p.pickup?.address} · {new Date(p.completed_at).toLocaleDateString()}</option>)}
      </select></label>
      <label className="label">Activity<input className="input mt-1" required minLength={3} maxLength={200} placeholder="e.g. Collecting and delivering food donations" value={activity} onChange={e => setActivity(e.target.value)} /></label>
      <label className="label">School, organization, or program (optional)<input className="input mt-1" maxLength={200} value={program} onChange={e => setProgram(e.target.value)} /></label>
      <label className="label">Service notes (optional)<textarea className="input mt-1" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <p className="text-sm text-gray-600">Only log time you actually served. An admin will verify your hours before signing.</p>
      <div className="flex flex-wrap gap-2"><button className="btn-primary" type="submit">{busy ? "Saving…" : "Request signature"}</button>
        <button className="btn-secondary" type="button" onClick={() => save(false)}>Save draft</button>
        <button className="btn-secondary" type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
