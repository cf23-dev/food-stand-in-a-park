import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { PickupRequest } from "@/lib/types";

const CANCEL_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/pickups/[id]/cancel — a volunteer releases their claimed pickup.
// Allowed only up to 24h before the pickup time; the pickup reopens for others.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pickupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();

  // Must be the volunteer who holds this claim, and it can't be completed.
  const { data: claim } = await admin
    .from("volunteer_claims")
    .select("*")
    .eq("pickup_id", pickupId)
    .single();

  if (!claim || claim.volunteer_id !== user.id) {
    return NextResponse.json({ error: "You haven't claimed this pickup." }, { status: 403 });
  }
  if (claim.completed_at) {
    return NextResponse.json({ error: "This pickup is already completed." }, { status: 409 });
  }

  // Enforce the 24-hour rule server-side (don't trust the client).
  const { data: pickup } = await admin
    .from("pickup_requests")
    .select("earliest_pickup")
    .eq("id", pickupId)
    .single();

  const earliest = (pickup as Pick<PickupRequest, "earliest_pickup"> | null)?.earliest_pickup;
  if (earliest) {
    const msUntil = new Date(earliest).getTime() - Date.now();
    if (msUntil <= CANCEL_CUTOFF_MS) {
      return NextResponse.json(
        {
          error:
            "Pickups can only be released more than 24 hours before the pickup time. " +
            "Please contact us if you have an emergency.",
        },
        { status: 403 }
      );
    }
  }

  // Release: delete the claim and reopen the pickup.
  await admin.from("volunteer_claims").delete().eq("id", claim.id);
  await admin.from("pickup_requests").update({ status: "open" }).eq("id", pickupId);

  return NextResponse.json({ ok: true });
}
