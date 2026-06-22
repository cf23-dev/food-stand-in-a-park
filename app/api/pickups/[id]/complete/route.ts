import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/pickups/[id]/complete — volunteer marks their claimed pickup done.
// Body: { delivery_photo_url?: string, quantity_lbs?: number }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pickupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { delivery_photo_url?: string; quantity_lbs?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  const admin = createAdminClient();

  // Verify the caller owns this claim.
  const { data: claim } = await admin
    .from("volunteer_claims")
    .select("*")
    .eq("pickup_id", pickupId)
    .single();

  if (!claim || claim.volunteer_id !== user.id) {
    return NextResponse.json({ error: "You haven't claimed this pickup." }, { status: 403 });
  }
  if (claim.completed_at) {
    return NextResponse.json({ error: "Already completed." }, { status: 409 });
  }

  await admin
    .from("volunteer_claims")
    .update({
      completed_at: new Date().toISOString(),
      delivery_photo_url: body.delivery_photo_url ?? claim.delivery_photo_url,
    })
    .eq("id", claim.id);

  const update: Record<string, unknown> = { status: "completed" };
  if (typeof body.quantity_lbs === "number") update.quantity_lbs = body.quantity_lbs;
  await admin.from("pickup_requests").update(update).eq("id", pickupId);

  return NextResponse.json({ ok: true });
}
