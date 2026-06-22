import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pickupRequestSchema } from "@/lib/validation";
import { geocodeAddress } from "@/lib/maps";
import { distanceMiles, formatMiles } from "@/lib/geo";
import {
  sendEmail,
  donorConfirmationEmail,
  volunteerNotifyEmail,
} from "@/lib/email";
import type { FoodBank, Profile } from "@/lib/types";

// POST /api/pickups — public donor submission.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = pickupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // The donor flow writes with the service-role key. If env vars are missing
  // (or the dev server wasn't restarted after editing .env.local), fail clearly
  // instead of crashing with an empty response.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Server is missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and " +
          "SUPABASE_SERVICE_ROLE_KEY in .env.local, then RESTART the dev server.",
      },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  // 1. Resolve coordinates — use client-provided ones, else geocode the address.
  let latitude = input.latitude;
  let longitude = input.longitude;
  if (!latitude || !longitude) {
    const geo = await geocodeAddress(input.address).catch(() => null);
    if (!geo) {
      return NextResponse.json(
        { error: "We couldn't locate that address. Try a fuller address (street, city, state)." },
        { status: 422 }
      );
    }
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  // 2. Find the nearest food bank to suggest.
  const { data: foodBanks } = await supabase.from("food_banks").select("*");
  let nearestBank: FoodBank | null = null;
  if (foodBanks?.length) {
    nearestBank = (foodBanks as FoodBank[]).reduce((best, fb) =>
      distanceMiles({ latitude, longitude }, fb) <
      distanceMiles({ latitude, longitude }, best)
        ? fb
        : best
    );
  }

  // 3. Insert the pickup request (bypasses RLS via service role).
  const { data: pickup, error } = await supabase
    .from("pickup_requests")
    .insert({
      donor_name: input.donor_name,
      donor_email: input.donor_email,
      donor_phone: input.donor_phone || null,
      address: input.address,
      latitude,
      longitude,
      food_type: input.food_type,
      quantity: input.quantity || null,
      quantity_lbs: input.quantity_lbs ?? null,
      notes: input.notes || null,
      earliest_pickup: input.earliest_pickup || null,
      latest_pickup: input.latest_pickup || null,
      status: "open",
      suggested_food_bank_id: nearestBank?.id ?? null,
    })
    .select()
    .single();

  if (error || !pickup) {
    console.error("pickup insert failed:", error);
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }

  // 4. Notify nearby approved volunteers (in-app + email). Best-effort.
  const radius = Number(process.env.NEXT_PUBLIC_DEFAULT_NOTIFY_RADIUS_MILES ?? 10);
  notifyVolunteers(supabase, pickup.id, { latitude, longitude }, input.food_type, input.address, radius).catch(
    (e) => console.error("notify failed:", e)
  );

  // 5. Confirmation email to donor (best-effort).
  await sendEmail({
    to: input.donor_email,
    subject: "We received your food donation 🥕",
    html: donorConfirmationEmail({
      donorName: input.donor_name,
      foodType: input.food_type,
      address: input.address,
    }),
  });

  return NextResponse.json({ id: pickup.id }, { status: 201 });
}

async function notifyVolunteers(
  supabase: ReturnType<typeof createAdminClient>,
  pickupId: string,
  loc: { latitude: number; longitude: number },
  foodType: string,
  address: string,
  radius: number
) {
  const { data: volunteers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "volunteer")
    .eq("approved", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (!volunteers?.length) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${siteUrl}/volunteer/dashboard`;

  const nearby = (volunteers as Profile[]).filter((v) => {
    const r = v.notify_radius_miles || radius;
    return distanceMiles(loc, { latitude: v.latitude!, longitude: v.longitude! }) <= r;
  });

  if (!nearby.length) return;

  // In-dashboard notifications.
  await supabase.from("notifications").insert(
    nearby.map((v) => ({
      volunteer_id: v.id,
      pickup_id: pickupId,
      title: `New ${foodType} pickup nearby`,
      body: address,
    }))
  );

  // Emails.
  await Promise.all(
    nearby.map((v) =>
      sendEmail({
        to: v.email,
        subject: "New food pickup available near you",
        html: volunteerNotifyEmail({
          foodType,
          address,
          url,
          milesAway: formatMiles(
            distanceMiles(loc, { latitude: v.latitude!, longitude: v.longitude! })
          ),
        }),
      })
    )
  );
}
