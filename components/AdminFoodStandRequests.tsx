"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, EmptyState } from "./ui";
import { foodStandStatuses, type FoodStandRequest } from "@/lib/food-stand";

export function AdminFoodStandRequests({ requests, loadError }: { requests: FoodStandRequest[]; loadError?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/food-stand-requests/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not update this request.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this request. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="stand-requests-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="stand-requests-heading" className="text-xl font-semibold">Food stand requests</h2>
          <p className="mt-1 text-sm text-gray-600">Contact volunteers to help them organize a community food collection stand.</p>
        </div>
        <button className="btn-secondary" disabled={refreshing || !!busy} onClick={() => startTransition(() => router.refresh())}>{refreshing ? "Refreshing…" : "Refresh requests"}</button>
      </div>
      {loadError && <Alert>{loadError}</Alert>}
      {error && <Alert>{error}</Alert>}
      {!loadError && requests.length === 0 && <EmptyState title="No food stand requests yet" body="Requests submitted from the volunteer dashboard will appear here." />}
      {requests.map(request => (
        <article key={request.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{request.name}</h3>
              <p className="mt-1 text-sm text-gray-600">Submitted {new Date(request.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="label" htmlFor={`stand-status-${request.id}`}>Request status</label>
              <select id={`stand-status-${request.id}`} className="input" value={request.status}
                disabled={!!busy || refreshing} onChange={event => updateStatus(request.id, event.target.value)}>
                {foodStandStatuses.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
              </select>
              {busy === request.id && <p role="status" className="mt-1 text-sm text-gray-600">Saving…</p>}
            </div>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-medium">Email</dt><dd className="mt-1 break-all"><a className="text-brand-700 hover:underline" href={`mailto:${request.email}`}>{request.email}</a></dd></div>
            <div><dt className="font-medium">Phone</dt><dd className="mt-1 text-gray-600">{request.phone}</dd></div>
            <div><dt className="font-medium">Age</dt><dd className="mt-1 text-gray-600">{request.age}</dd></div>
            <div><dt className="font-medium">State &amp; ZIP code</dt><dd className="mt-1 break-words text-gray-600">{request.state_zip}</dd></div>
            <div className="sm:col-span-2"><dt className="font-medium">How they heard about the opportunity</dt><dd className="mt-1 whitespace-pre-wrap break-words text-gray-600">{request.referral || "Not provided"}</dd></div>
            <div className="sm:col-span-2"><dt className="font-medium">Volunteer and event updates</dt><dd className="mt-1 text-gray-600">{request.receive_updates ? "Opted in" : "Not opted in"}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}
