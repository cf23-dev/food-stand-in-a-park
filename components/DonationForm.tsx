"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { Alert, Spinner } from "./ui";
import { FOOD_TYPES } from "@/lib/types";

// Hour-long pickup windows from 10am–11am through 4pm–5pm.
// `start`/`end` are 24-hour clock hours used to build the timestamps.
const PICKUP_WINDOWS = Array.from({ length: 7 }, (_, i) => {
  const start = 10 + i; // 10..16
  const fmt = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };
  return { value: `${start}`, label: `${fmt(start)} – ${fmt(start + 1)}`, start, end: start + 1 };
});

// Combine a "YYYY-MM-DD" date with an hour into a local-time ISO timestamp.
function toTimestamp(date: string, hour: number): string {
  const hh = String(hour).padStart(2, "0");
  return new Date(`${date}T${hh}:00:00`).toISOString();
}

export function DonationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  // Earliest selectable pickup date = today + 2 days, so there's time to arrange
  // logistics. Computed after mount to avoid an SSR/client hydration mismatch.
  const [minDate, setMinDate] = useState("");
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setMinDate(d.toLocaleDateString("en-CA")); // YYYY-MM-DD in local time
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    // Convert the chosen date + time window into start/end timestamps.
    const pickupDate = String(fd.get("pickup_date") ?? "");
    const windowValue = String(fd.get("pickup_window") ?? "");
    const win = PICKUP_WINDOWS.find((w) => w.value === windowValue);
    const earliest_pickup = pickupDate && win ? toTimestamp(pickupDate, win.start) : "";
    const latest_pickup = pickupDate && win ? toTimestamp(pickupDate, win.end) : "";

    const payload = {
      donor_name: String(fd.get("donor_name") ?? ""),
      donor_email: String(fd.get("donor_email") ?? ""),
      donor_phone: String(fd.get("donor_phone") ?? ""),
      address: address || String(fd.get("address") ?? ""),
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      food_type: String(fd.get("food_type") ?? ""),
      quantity: String(fd.get("quantity") ?? ""),
      quantity_lbs: fd.get("quantity_lbs") ? Number(fd.get("quantity_lbs")) : undefined,
      notes: String(fd.get("notes") ?? ""),
      earliest_pickup,
      latest_pickup,
    };

    try {
      const res = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Read as text first so an empty/non-JSON error body can't crash us.
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new Error(
          data.error ?? `Request failed (${res.status}). Check the dev-server terminal for details.`
        );
      }
      router.push(`/donate/confirmation?id=${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="donor_name" className="label">Your name *</label>
          <input id="donor_name" name="donor_name" className="input" required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="donor_email" className="label">Email *</label>
          <input id="donor_email" name="donor_email" type="email" className="input" required autoComplete="email" />
        </div>
      </div>

      <div>
        <label htmlFor="donor_phone" className="label">Phone number (optional)</label>
        <input id="donor_phone" name="donor_phone" type="tel" className="input" autoComplete="tel" />
      </div>

      <div>
        <label htmlFor="address" className="label">Pickup address *</label>
        <AddressAutocomplete
          id="address"
          required
          onSelect={(v) => {
            setAddress(v.address);
            if (v.latitude && v.longitude) setCoords({ latitude: v.latitude, longitude: v.longitude });
          }}
        />
        <p className="mt-1 text-xs text-gray-500">Select from suggestions so we can map your pickup accurately.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="food_type" className="label">Food type *</label>
          <select id="food_type" name="food_type" className="input" required defaultValue="">
            <option value="" disabled>Select…</option>
            {FOOD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="label">Estimated quantity</label>
          <input id="quantity" name="quantity" className="input" placeholder="e.g. 3 boxes, 20 cans" />
        </div>
      </div>

      <div>
        <label htmlFor="quantity_lbs" className="label">Approx. weight (lbs, optional)</label>
        <input id="quantity_lbs" name="quantity_lbs" type="number" min="0" step="any" className="input" placeholder="Helps us track community impact" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pickup_date" className="label">Pickup date</label>
          <input
            id="pickup_date"
            name="pickup_date"
            type="date"
            className="input"
            min={minDate || undefined}
          />
          <p className="mt-1 text-xs text-gray-500">
            Please schedule at least 2 days out so we can arrange a volunteer and the drop-off.
          </p>
        </div>
        <div>
          <label htmlFor="pickup_window" className="label">Pickup time window</label>
          <select id="pickup_window" name="pickup_window" className="input" defaultValue="">
            <option value="">Select a time…</option>
            {PICKUP_WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="label">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={3} className="input" placeholder="Access instructions, parking, etc." />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? <Spinner label="Submitting" /> : "Submit donation"}
      </button>
    </form>
  );
}
