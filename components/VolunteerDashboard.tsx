"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PickupMap } from "./PickupMap";
import { Alert, EmptyState, Spinner, StatusBadge } from "./ui";
import { distanceMiles, formatMiles, directionsUrl } from "@/lib/geo";
import type { FoodBank, Notification, PickupRequest, Profile, VolunteerClaim } from "@/lib/types";

type ClaimWithPickup = VolunteerClaim & { pickup: PickupRequest; food_bank: FoodBank | null };
type Tab = "available" | "active" | "history" | "impact";

interface Props {
  profile: Profile | null;
  openPickups: PickupRequest[];
  claims: ClaimWithPickup[];
  foodBanks: FoodBank[];
  notifications: Notification[];
}

export function VolunteerDashboard({ profile, openPickups, claims, foodBanks, notifications }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("available");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const home = profile?.latitude != null && profile?.longitude != null
    ? { latitude: profile.latitude, longitude: profile.longitude }
    : null;

  // Attach distance to open pickups and sort nearest-first.
  const pickupsWithDistance = useMemo(() => {
    const list = openPickups.map((p) => ({
      ...p,
      distance_miles: home ? distanceMiles(home, p) : undefined,
    }));
    if (home) list.sort((a, b) => (a.distance_miles ?? 0) - (b.distance_miles ?? 0));
    return list;
  }, [openPickups, home]);

  const active = claims.filter((c) => !c.completed_at);
  const completed = claims.filter((c) => c.completed_at);

  // Impact stats.
  const totalLbs = completed.reduce((sum, c) => sum + (c.pickup?.quantity_lbs ?? 0), 0);
  const foodBanksServed = new Set(completed.map((c) => c.food_bank_id).filter(Boolean)).size;
  const unread = notifications.filter((n) => !n.read).length;

  async function claim(pickupId: string) {
    setBusy(pickupId);
    setError(null);
    const res = await fetch(`/api/pickups/${pickupId}/claim`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setError(data.error ?? "Could not claim pickup.");
    router.refresh();
  }

  async function complete(pickupId: string, photoUrl?: string, lbs?: number) {
    setBusy(pickupId);
    setError(null);
    const res = await fetch(`/api/pickups/${pickupId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_photo_url: photoUrl, quantity_lbs: lbs }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setError(data.error ?? "Could not complete pickup.");
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const unapproved = profile && profile.role === "volunteer" && !profile.approved;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hi{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-gray-600">Volunteer dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="badge bg-amber-100 text-amber-800">{unread} new</span>
          )}
          <button onClick={signOut} className="btn-secondary">Sign out</button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert kind="error">{error}</Alert></div>}

      {unapproved && (
        <div className="mt-4">
          <Alert kind="info">
            Your account is pending admin approval. You can browse pickups, but you'll be
            able to claim them once an admin approves you.
          </Alert>
        </div>
      )}

      {!home && (
        <div className="mt-4">
          <LocationPrompt onSaved={() => router.refresh()} />
        </div>
      )}

      <NotificationsBar notifications={notifications} />

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200" role="tablist">
        {([
          ["available", `Available (${pickupsWithDistance.length})`],
          ["active", `My pickups (${active.length})`],
          ["history", `History (${completed.length})`],
          ["impact", "Impact"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key ? "border-brand-700 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "available" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="order-2 space-y-3 lg:order-1">
              {pickupsWithDistance.length === 0 ? (
                <EmptyState title="No open pickups right now" body="Check back soon — new donations appear here." />
              ) : (
                pickupsWithDistance.map((p) => (
                  <article
                    key={p.id}
                    className={`card transition ${selected === p.id ? "ring-2 ring-brand-500" : ""}`}
                    onMouseEnter={() => setSelected(p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.food_type}</h3>
                        <p className="text-sm text-gray-600">{p.address}</p>
                      </div>
                      {p.distance_miles != null && (
                        <span className="badge bg-gray-100 text-gray-700">{formatMiles(p.distance_miles)}</span>
                      )}
                    </div>
                    {p.quantity && <p className="mt-2 text-sm text-gray-500">Qty: {p.quantity}</p>}
                    {p.notes && <p className="mt-1 text-sm text-gray-500">“{p.notes}”</p>}
                    <button
                      className="btn-primary mt-3 w-full"
                      disabled={busy === p.id || !!unapproved}
                      onClick={() => claim(p.id)}
                    >
                      {busy === p.id ? <Spinner label="Claiming" /> : "Claim pickup"}
                    </button>
                  </article>
                ))
              )}
            </div>
            <div className="order-1 h-96 lg:order-2 lg:sticky lg:top-20 lg:h-[32rem]">
              <PickupMap
                pickups={pickupsWithDistance}
                foodBanks={foodBanks}
                volunteer={home}
                selectedId={selected}
                onSelect={setSelected}
              />
            </div>
          </div>
        )}

        {tab === "active" && (
          <div className="space-y-3">
            {active.length === 0 ? (
              <EmptyState title="No active pickups" body="Claim one from the Available tab to get started." />
            ) : (
              active.map((c) => (
                <ActiveClaimCard key={c.id} claim={c} busy={busy === c.pickup_id} onComplete={complete} />
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {completed.length === 0 ? (
              <EmptyState title="No completed pickups yet" />
            ) : (
              completed.map((c) => (
                <div key={c.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{c.pickup?.food_type}</p>
                    <p className="text-sm text-gray-600">{c.pickup?.address}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Delivered {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : ""}
                      {c.food_bank ? ` → ${c.food_bank.name}` : ""}
                    </p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "impact" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Pickups completed" value={completed.length} icon="✅" />
            <Stat label="Pounds of food collected" value={Math.round(totalLbs)} icon="⚖️" />
            <Stat label="Food banks served" value={foodBanksServed} icon="🏬" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <div className="mt-2 text-3xl font-extrabold text-brand-700">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ActiveClaimCard({
  claim,
  busy,
  onComplete,
}: {
  claim: ClaimWithPickup;
  busy: boolean;
  onComplete: (pickupId: string, photoUrl?: string, lbs?: number) => void;
}) {
  const [lbs, setLbs] = useState<string>(claim.pickup?.quantity_lbs?.toString() ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(claim.delivery_photo_url ?? undefined);
  const p = claim.pickup;

  async function uploadPhoto(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `${claim.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("delivery-photos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("delivery-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{p?.food_type}</h3>
          <p className="text-sm text-gray-600">{p?.address}</p>
          {p?.donor_phone && <p className="text-sm text-gray-500">Donor: {p.donor_name} · {p.donor_phone}</p>}
        </div>
        <StatusBadge status="claimed" />
      </div>

      {claim.food_bank && p && (
        <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm">
          <p className="font-medium text-brand-800">Drop off at: {claim.food_bank.name}</p>
          <p className="text-gray-600">{claim.food_bank.address}</p>
          <a
            className="text-brand-700 underline"
            target="_blank"
            rel="noopener noreferrer"
            href={directionsUrl(
              { latitude: p.latitude, longitude: p.longitude },
              { latitude: claim.food_bank.latitude, longitude: claim.food_bank.longitude }
            )}
          >
            Get directions to food bank
          </a>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Weight collected (lbs)</label>
          <input
            type="number"
            min="0"
            step="any"
            className="input"
            value={lbs}
            onChange={(e) => setLbs(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Delivery photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
          />
          {uploading && <p className="mt-1 text-xs text-gray-500">Uploading…</p>}
          {photoUrl && <p className="mt-1 text-xs text-brand-700">Photo attached ✓</p>}
        </div>
      </div>

      <button
        className="btn-primary mt-4 w-full"
        disabled={busy}
        onClick={() => onComplete(claim.pickup_id, photoUrl, lbs ? Number(lbs) : undefined)}
      >
        {busy ? <Spinner label="Completing" /> : "Mark as completed"}
      </button>
    </div>
  );
}

function NotificationsBar({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return null;

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).in("id", unread.map((n) => n.id));
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-amber-900">🔔 Notifications</h2>
        <button onClick={markAllRead} className="text-sm font-medium text-amber-800 hover:underline">
          Mark all read
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {unread.slice(0, 5).map((n) => (
          <li key={n.id}>
            <strong>{n.title}</strong>
            {n.body ? ` — ${n.body}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LocationPrompt({ onSaved }: { onSaved: () => void }) {
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    setSaving(false);
    if (!res.ok) return setErr("Could not save your location.");
    onSaved();
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="font-medium text-blue-900">Set your base location</p>
      <p className="text-sm text-blue-800">
        Add an address or ZIP so we can show distances and notify you about nearby pickups.
      </p>
      {err && <p className="mt-1 text-sm text-red-700">{err}</p>}
      <div className="mt-2 flex gap-2">
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 98105 or your street address"
        />
        <button className="btn-primary" disabled={saving || !address} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
