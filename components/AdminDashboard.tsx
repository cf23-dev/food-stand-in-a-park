"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, EmptyState } from "./ui";
import { AdminHourRequests } from "./AdminHourRequests";
import { AdminFoodStandRequests } from "./AdminFoodStandRequests";
import type { FoodStandRequest } from "@/lib/food-stand";
import type { HourEntry } from "@/lib/hours";
import { FOOD_TYPES } from "@/lib/types";
import type { Feedback, FoodBank, PickupRequest, PickupStatus, Profile } from "@/lib/types";

export type FeedbackRow = Feedback & { pickup: { food_type: string } | null };

type Tab = "overview" | "pickups" | "volunteers" | "foodbanks" | "feedback" | "hours" | "food-stands";

interface Props {
  pickups: PickupRequest[];
  volunteers: Profile[];
  foodBanks: FoodBank[];
  feedback: FeedbackRow[];
  hourEntries: HourEntry[];
  hoursError?: string;
  adminName: string;
  adminId: string;
  foodStandRequests: FoodStandRequest[];
  foodStandError?: string;
}

export function AdminDashboard({ pickups: receivedPickups, volunteers, foodBanks, feedback, hourEntries, hoursError, adminName, adminId, foodStandRequests, foodStandError }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [selectedPickups, setSelectedPickups] = useState<Set<string>>(() => new Set());
  const [deletedPickups, setDeletedPickups] = useState<Set<string>>(() => new Set());
  const [deletingPickups, setDeletingPickups] = useState(false);
  const [pickupNotice, setPickupNotice] = useState<string | null>(null);
  const deletionLock = useRef(false);
  const pickups = receivedPickups.filter(p => !deletedPickups.has(p.id));
  const selectedIds = pickups.filter(p => selectedPickups.has(p.id)).map(p => p.id);
  const allSelected = pickups.length > 0 && selectedIds.length === pickups.length;

  function togglePickup(id: string) {
    setSelectedPickups(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deletePickups(ids: string[]) {
    if (!ids.length || deletionLock.current) return;
    deletionLock.current = true;
    const prompt = ids.length === 1
      ? `Delete the pickup from ${pickups.find(p => p.id === ids[0])?.donor_name ?? "this donor"}?`
      : `Delete ${ids.length} selected pickups?`;
    if (!window.confirm(`${prompt} Related claims and pickup notifications will also be removed. This cannot be undone.`)) {
      deletionLock.current = false;
      return;
    }
    setDeletingPickups(true);
    setError(null);
    setPickupNotice(null);
    const deleted: string[] = [];
    const failed: { id: string; message: string }[] = [];
    try {
      // Bound concurrency and keep individual failures visible without rolling
      // back successful deletions of unrelated pickups.
      for (let offset = 0; offset < ids.length; offset += 5) {
        const results = await Promise.all(ids.slice(offset, offset + 5).map(async id => {
          try {
            const res = await fetch(`/api/admin/pickups/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            return res.ok ? { id, ok: true as const } : { id, ok: false as const, message: data.error ?? "Could not delete this pickup." };
          } catch {
            return { id, ok: false as const, message: "Connection interrupted. Refresh to check whether this pickup was deleted." };
          }
        }));
        for (const result of results) {
          if (result.ok) deleted.push(result.id); else failed.push({ id: result.id, message: result.message });
        }
      }
      setDeletedPickups(current => new Set([...current, ...deleted]));
      setSelectedPickups(current => {
        const next = new Set(current);
        for (const id of deleted) next.delete(id);
        for (const failure of failed) next.add(failure.id);
        return next;
      });
      if (deleted.length) setPickupNotice(`${deleted.length} pickup${deleted.length === 1 ? "" : "s"} deleted.`);
      if (failed.length) setError(`${failed.length} pickup${failed.length === 1 ? " could" : "s could"} not be deleted and remain selected. ${Array.from(new Set(failed.map(f => f.message))).join(" ")}`);
      router.refresh();
    } finally {
      deletionLock.current = false;
      setDeletingPickups(false);
    }
  }

  async function call(url: string, method: string, body?: unknown) {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Action failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  const stats = {
    open: pickups.filter((p) => p.status === "open").length,
    claimed: pickups.filter((p) => p.status === "claimed").length,
    completed: pickups.filter((p) => p.status === "completed").length,
    lbs: pickups.filter((p) => p.status === "completed").reduce((s, p) => s + (p.quantity_lbs ?? 0), 0),
    pendingVols: volunteers.filter((v) => !v.approved).length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Admin dashboard</h1>
      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
        {([
          ["overview", "Overview"],
          ["pickups", `Pickups (${pickups.length})`],
          ["volunteers", `Volunteers (${volunteers.length})`],
          ["foodbanks", `Food banks (${foodBanks.length})`],
          ["feedback", `Feedback (${feedback.length})`],
          ["hours", `Hour requests (${hourEntries.filter(e => e.status === "pending").length})`],
          ["food-stands", `Food stand requests (${foodStandRequests.filter(r => r.status === "new").length} new)`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key ? "border-brand-700 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "food-stands" && <AdminFoodStandRequests requests={foodStandRequests} loadError={foodStandError} />}
        {tab === "hours" && <AdminHourRequests entries={hourEntries} signerName={adminName} adminId={adminId} loadError={hoursError} />}
        {tab === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Open" value={stats.open} />
              <Stat label="Claimed" value={stats.claimed} />
              <Stat label="Completed" value={stats.completed} />
              <Stat label="Lbs delivered" value={Math.round(stats.lbs)} />
            </div>
            {stats.pendingVols > 0 && (
              <div className="mt-4">
                <Alert kind="info">{stats.pendingVols} volunteer(s) awaiting approval in the Volunteers tab.</Alert>
              </div>
            )}
            {foodStandError && <div className="mt-4"><Alert>{foodStandError}</Alert></div>}
            {foodStandRequests.some(r => r.status === "new") && <div className="mt-4"><Alert kind="info">
              {foodStandRequests.filter(r => r.status === "new").length} food stand request(s) awaiting follow-up. <button className="underline" onClick={() => setTab("food-stands")}>Review requests</button>
            </Alert></div>}
            {hourEntries.some(e => e.status === "pending") && <div className="mt-4"><Alert kind="info">
              {hourEntries.filter(e => e.status === "pending").length} hour request(s) awaiting signature. <button className="underline" onClick={() => setTab("hours")}>Review requests</button>
            </Alert></div>}
            <div className="mt-6">
              <h2 className="font-semibold text-gray-900">Export reports</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <a className="btn-secondary" href="/api/admin/export?type=pickups">Pickups CSV</a>
                <a className="btn-secondary" href="/api/admin/export?type=volunteers">Volunteers CSV</a>
                <a className="btn-secondary" href="/api/admin/export?type=foodbanks">Food banks CSV</a>
              </div>
            </div>
          </>
        )}

        {tab === "pickups" && (
          <div className="space-y-4">
            {pickupNotice && <Alert kind="success">{pickupNotice}</Alert>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600" role="status">{selectedIds.length} pickup{selectedIds.length === 1 ? "" : "s"} selected</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" disabled={deletingPickups || !selectedIds.length} onClick={() => setSelectedPickups(new Set())}>Clear selection</button>
                <button className="btn-danger" disabled={deletingPickups || !selectedIds.length} onClick={() => deletePickups(selectedIds)}>
                  {deletingPickups ? "Deleting…" : `Delete selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3">
                    <label className="inline-flex h-11 w-11 items-center justify-center">
                    <input type="checkbox" className="h-4 w-4 accent-brand-700" aria-label="Select all pickups" checked={allSelected}
                      aria-checked={selectedIds.length > 0 && !allSelected ? "mixed" : allSelected}
                      ref={node => { if (node) node.indeterminate = selectedIds.length > 0 && !allSelected; }}
                      disabled={deletingPickups || !pickups.length}
                      onChange={() => setSelectedPickups(allSelected ? new Set() : new Set(pickups.map(p => p.id)))} />
                    </label>
                  </th>
                  <th className="py-2 pr-3">Donor</th>
                  <th className="py-2 pr-3">Food</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {pickups.map((p) => (
                  <tr key={p.id} className={`border-b border-gray-100 ${selectedPickups.has(p.id) ? "bg-brand-50" : ""}`}>
                    <td className="py-2 pr-3">
                      <label className="inline-flex h-11 w-11 items-center justify-center">
                      <input type="checkbox" className="h-4 w-4 accent-brand-700"
                        aria-label={`Select pickup from ${p.donor_name}: ${p.food_type}, ${p.address}`}
                        checked={selectedPickups.has(p.id)} disabled={deletingPickups} onChange={() => togglePickup(p.id)} />
                      </label>
                    </td>
                    <td className="py-2 pr-3">{p.donor_name}<br /><span className="text-gray-400">{p.donor_email}</span></td>
                    <td className="py-2 pr-3">{p.food_type}{p.quantity ? ` (${p.quantity})` : ""}</td>
                    <td className="py-2 pr-3 max-w-48 truncate" title={p.address}>{p.address}</td>
                    <td className="py-2 pr-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-3">
                      <select
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        value={p.status}
                        aria-label={`Status for pickup from ${p.donor_name}`}
                        disabled={deletingPickups}
                        onChange={(e) => call(`/api/admin/pickups/${p.id}`, "PATCH", { status: e.target.value as PickupStatus })}
                      >
                        <option value="open">Open</option>
                        <option value="claimed">Claimed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deletingPickups}
                        onClick={() => deletePickups([p.id])}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {pickups.length === 0 && <EmptyState title="No pickup requests yet" />}
          </div>
        )}

        {tab === "volunteers" && (
          <div className="space-y-2">
            {volunteers.length === 0 && <EmptyState title="No volunteers yet" />}
            {volunteers.map((v) => (
              <div key={v.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{v.name || "(no name)"}</p>
                  <p className="text-sm text-gray-500">{v.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${v.approved ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-800"}`}>
                    {v.approved ? "Approved" : "Pending"}
                  </span>
                  <button
                    className="btn-secondary px-3 py-1.5"
                    onClick={() => call(`/api/admin/volunteers/${v.id}`, "PATCH", { approved: !v.approved })}
                  >
                    {v.approved ? "Revoke" : "Approve"}
                  </button>
                  <button
                    className="btn-danger px-3 py-1.5"
                    onClick={() => {
                      if (confirm(`Remove ${v.name || v.email}? This deletes their account.`)) {
                        call(`/api/admin/volunteers/${v.id}`, "DELETE");
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "foodbanks" && <FoodBankManager foodBanks={foodBanks} onCreate={(b) => call("/api/admin/food-banks", "POST", b)} />}

        {tab === "feedback" && (
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <EmptyState title="No feedback yet" body="Donor feedback will appear here after pickups are completed." />
            ) : (
              feedback.map((f) => (
                <div key={f.id} className="card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-accent-500" aria-label={`${f.rating} out of 5`}>
                      {"★".repeat(f.rating)}
                      <span className="text-gray-300">{"★".repeat(5 - f.rating)}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {f.comment && <p className="mt-2 text-sm text-gray-700">“{f.comment}”</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    {f.pickup?.food_type ?? "—"}
                    {f.donor_email ? ` · ${f.donor_email}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-3xl font-extrabold text-brand-700">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function FoodBankManager({
  foodBanks,
  onCreate,
}: {
  foodBanks: FoodBank[];
  onCreate: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<string[]>([]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await onCreate({
      name: fd.get("name"),
      address: fd.get("address"),
      phone: fd.get("phone") || "",
      website: fd.get("website") || "",
      hours: fd.get("hours") || "",
      accepted_types: types,
      latitude: fd.get("latitude") ? Number(fd.get("latitude")) : undefined,
      longitude: fd.get("longitude") ? Number(fd.get("longitude")) : undefined,
    });
    if (ok) {
      setOpen(false);
      setTypes([]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="font-semibold text-gray-900">Food banks</h2>
        <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "Add food bank"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address (auto-geocoded if no coordinates)</label>
            <input name="address" className="input" required />
          </div>
          <div><label className="label">Latitude (optional)</label><input name="latitude" className="input" /></div>
          <div><label className="label">Longitude (optional)</label><input name="longitude" className="input" /></div>
          <div><label className="label">Phone</label><input name="phone" className="input" /></div>
          <div><label className="label">Website</label><input name="website" className="input" placeholder="https://" /></div>
          <div className="sm:col-span-2"><label className="label">Hours</label><input name="hours" className="input" /></div>
          <div className="sm:col-span-2">
            <span className="label">Accepted types</span>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={(e) => setTypes((cur) => (e.target.checked ? [...cur, t] : cur.filter((x) => x !== t)))}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary w-full" type="submit">Save food bank</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {foodBanks.map((fb) => (
          <div key={fb.id} className="card">
            <p className="font-medium text-gray-900">{fb.name}</p>
            <p className="text-sm text-gray-600">{fb.address}</p>
            {fb.hours && <p className="text-sm text-gray-500">{fb.hours}</p>}
          </div>
        ))}
      </div>
      {foodBanks.length === 0 && <EmptyState title="No food banks yet" body="Add one to enable nearest-food-bank suggestions." />}
    </div>
  );
}
