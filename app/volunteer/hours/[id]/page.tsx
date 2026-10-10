import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatHours, formatServiceDate, type HourEntry } from "@/lib/hours";
import { SignatureDisplay } from "@/components/SignatureDisplay";
import { PrintRecordButton } from "@/components/PrintRecordButton";

export const dynamic = "force-dynamic";
export default async function SignedHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/volunteer/login?next=${encodeURIComponent(`/volunteer/hours/${id}`)}`);
  // RLS permits only the volunteer and administrators to view the signature.
  const { data, error } = await supabase.from("volunteer_hours").select("*").eq("id", id).eq("status", "signed").maybeSingle();
  if (error) throw new Error("Could not load the signed hour record.");
  if (!data) notFound();
  const entry = data as HourEntry;
  return <div className="service-record mx-auto max-w-3xl px-4 py-10">
    <div className="record-actions mb-6 flex flex-wrap items-center justify-between gap-3">
      <a className="text-sm text-brand-700 underline" href="/volunteer/dashboard">Back to dashboard</a><PrintRecordButton />
      <p className="w-full text-sm text-gray-600">Choose “Save as PDF” in your browser’s print dialog to download this record.</p>
    </div>
    <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-10">
      <p className="font-semibold text-brand-800">Food Stand in a Park</p>
      <h1 className="mt-3 text-3xl font-bold">Volunteer service record</h1>
      <p className="mt-2 text-gray-600">Verified service hours</p>
      <dl className="mt-8 grid gap-5 sm:grid-cols-2">
        {[["Volunteer", entry.volunteer_name], ["Service date", formatServiceDate(entry.service_date)],
          ["Verified hours", formatHours(entry.duration_minutes)], ["School / organization / program", entry.program || "Not specified"]].map(([label, value]) =>
          <div key={label}><dt className="text-sm text-gray-600">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
      </dl>
      <div className="mt-6"><h2 className="text-sm text-gray-600">Activity</h2><p className="mt-1">{entry.activity}</p></div>
      {entry.notes && <div className="mt-5"><h2 className="text-sm text-gray-600">Service notes</h2><p className="mt-1 whitespace-pre-wrap">{entry.notes}</p></div>}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-600">I have verified this volunteer’s service and confirm the recorded hours are accurate.</p>
        {entry.signature && <SignatureDisplay signature={entry.signature} />}
        <p className="font-semibold">{entry.signer_name}</p><p className="text-sm text-gray-600">{entry.signer_title}</p>
        <p className="mt-2 text-sm text-gray-600">Signed {new Date(entry.signed_at!).toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" })}</p>
      </div>
      <p className="mt-8 break-all text-xs text-gray-600">Record ID: {entry.id}</p>
      <p className="mt-1 text-xs text-gray-600">This record was signed electronically by an authenticated administrator. Signed service details are locked.</p>
    </article>
  </div>;
}
