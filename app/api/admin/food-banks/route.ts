import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { foodBankSchema } from "@/lib/validation";
import { geocodeAddress } from "@/lib/maps";

// POST — create a food bank. Geocodes the address if coords aren't given.
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = foodBankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const fb = parsed.data;

  let { latitude, longitude } = fb;
  if (!latitude || !longitude) {
    const geo = await geocodeAddress(fb.address);
    if (!geo) return NextResponse.json({ error: "Could not geocode address." }, { status: 422 });
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("food_banks")
    .insert({ ...fb, latitude, longitude, website: fb.website || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: "Create failed." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
