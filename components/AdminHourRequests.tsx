"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, EmptyState } from "./ui";
import { HourBadge, sendHourCommand } from "./VolunteerHours";
import { SignaturePad } from "./SignaturePad";
import { formatHours, formatServiceDate, hourCommandSchema, type HourEntry, type Signature } from "@/lib/hours";

export function AdminHourRequests({ entries, signerName, adminId, loadError }: {
  entries: HourEntry[]; signerName: string; adminId: string; loadError?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<HourEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visible = entries.filter(e => filter === "all" || e.status === filter);
  return <section className="space-y-5" aria-label="Volunteer hour requests">
    <div><h2 className="text-xl font-semibold">Volunteer hour requests</h2>
      <p className="text-sm text-gray-600">Verify the service details, then sign or explain the changes needed.</p></div>
    {loadError && <Alert>{loadError}</Alert>}{notice && <Alert kind="success">{notice}</Alert>}
    {selected && <ReviewForm key={`${selected.id}-${selected.version}`} entry={selected} signerName={signerName}
      onCancel={() => setSelected(null)} onSaved={signed => { setSelected(null); setNotice(signed ? "Hours signed. The volunteer has been notified." : "Request returned with your feedback."); router.refresh(); }} />}
    <label className="label max-w-xs">Show requests<select className="input mt-1" value={filter} onChange={e => setFilter(e.target.value)}>
      <option value="pending">Awaiting signature</option><option value="returned">Needs changes</option><option value="signed">Signed</option><option value="all">All submitted requests</option>
    </select></label>
    {!loadError && !visible.length && <EmptyState title="No requests with this status" body="Volunteer requests will appear here when they are submitted." />}
    <div className="space-y-3">{visible.map(entry => <article className="card" key={entry.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{entry.volunteer_name}</h3>
        <p className="text-sm text-gray-600">{formatServiceDate(entry.service_date)} · {formatHours(entry.duration_minutes)}</p>
        <p className="mt-1 text-sm">{entry.activity}</p>{entry.program && <p className="text-sm text-gray-600">Program: {entry.program}</p>}
      </div><HourBadge status={entry.status} /></div>
      {entry.claim && <p className="mt-2 text-sm text-gray-600">Linked pickup: {entry.claim.pickup?.food_type} · {entry.claim.pickup?.address}
        {entry.claim.completed_at && ` · Completed ${new Date(entry.claim.completed_at).toLocaleDateString()}`}</p>}
      {entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{entry.notes}</p>}
      {entry.review_note && <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">Previous feedback: {entry.review_note}</p>}
      {entry.status === "pending" && entry.volunteer_id !== adminId && <button className="btn-primary mt-3" onClick={() => { setSelected(entry); setNotice(null); }}>Review &amp; sign</button>}
      {entry.status === "pending" && entry.volunteer_id === adminId && <p className="mt-3 text-sm text-gray-600">Another administrator must review your own hours.</p>}
      {entry.status === "signed" && <a className="btn-secondary mt-3" href={`/volunteer/hours/${entry.id}`} target="_blank" rel="noopener noreferrer">View signed record</a>}
    </article>)}</div>
  </section>;
}

function ReviewForm({ entry, signerName, onCancel, onSaved }: { entry: HourEntry; signerName: string; onCancel: () => void; onSaved: (signed: boolean) => void }) {
  const [name, setName] = useState(signerName);
  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState<Signature>({ kind: "drawn", strokes: [] });
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(sign: boolean) {
    if (busy) return;
    setError(null);
    const command = sign ? { action: "sign", id: entry.id, version: entry.version, signer_name: name,
      signer_title: title, signature, confirmed } : { action: "return", id: entry.id, version: entry.version, review_note: note };
    const parsed = hourCommandSchema.safeParse(command);
    if (!parsed.success) { setError(sign && !confirmed ? "Confirm you verified the volunteer’s service before signing." : parsed.error.issues[0].message); return; }
    setBusy(true);
    try { await sendHourCommand(parsed.data); onSaved(sign); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <form className="card space-y-4" onSubmit={e => { e.preventDefault(); save(true); }}>
    <h3 className="font-semibold">Review hours for {entry.volunteer_name}</h3>
    <p className="text-sm text-gray-600">{formatServiceDate(entry.service_date)} · {formatHours(entry.duration_minutes)} · {entry.activity}</p>
    {entry.program && <p className="text-sm text-gray-600">School / program: {entry.program}</p>}
    {entry.claim && <p className="text-sm text-gray-600">Linked pickup: {entry.claim.pickup?.food_type} · {entry.claim.pickup?.address}
      {entry.claim.completed_at && ` · Completed ${new Date(entry.claim.completed_at).toLocaleDateString()}`}</p>}
    {entry.notes && <p className="whitespace-pre-wrap text-sm text-gray-600">{entry.notes}</p>}
    {error && <Alert>{error}</Alert>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Signer’s full name<input className="input mt-1" minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="label">Title or role<input className="input mt-1" minLength={2} maxLength={120} placeholder="e.g. Volunteer coordinator" value={title} onChange={e => setTitle(e.target.value)} /></label>
      </div>
      <SignaturePad value={signature} onChange={setSignature} disabled={busy} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        I have verified this volunteer’s service and confirm the recorded hours are accurate. I intend this signature to certify this record.</label>
      <p className="text-sm text-gray-600">Signing locks these service details and records your account identity and the signing time.</p>
      <button type="submit" className="btn-primary">{busy ? "Saving…" : "Sign verified hours"}</button>
      <div className="border-t border-gray-200 pt-4">
        <label className="label">Changes needed<textarea className="input mt-1" rows={3} maxLength={2000} placeholder="Explain what the volunteer should correct" value={note} onChange={e => setNote(e.target.value)} /></label>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={() => save(false)}>Return for changes</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel review</button></div>
      </div>
    </fieldset>
  </form>;
}
