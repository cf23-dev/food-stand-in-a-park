import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/maps";

// PATCH /api/profile — update the signed-in user's name, base location, radius.
// Body: { name?, address?, notify_radius_miles? }
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.notify_radius_miles === "number")
    update.notify_radius_miles = Math.max(1, Math.min(100, body.notify_radius_miles));

  if (typeof body.address === "string" && body.address.trim()) {
    const geo = await geocodeAddress(body.address);
    if (geo) {
      update.latitude = geo.latitude;
      update.longitude = geo.longitude;
    }
  }
  if (typeof body.latitude === "number") update.latitude = body.latitude;
  if (typeof body.longitude === "number") update.longitude = body.longitude;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
