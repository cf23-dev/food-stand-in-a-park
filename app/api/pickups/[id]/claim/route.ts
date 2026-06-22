import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail, donorClaimedEmail } from "@/lib/email";
import type { PickupRequest } from "@/lib/types";

// POST /api/pickups/[id]/claim — an approved volunteer claims an open pickup.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pickupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, approved")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "volunteer" || !profile.approved) {
    return NextResponse.json(
      { error: "Your volunteer account isn't approved yet." },
      { status: 403 }
    );
  }

  // Atomic-ish claim: only succeeds if the pickup is still open.
  const admin = createAdminClient();
  const { data: pickup } = await admin
    .from("pickup_requests")
    .select("*")
    .eq("id", pickupId)
    .single();

  if (!pickup) return NextResponse.json({ error: "Pickup not found." }, { status: 404 });
  if ((pickup as PickupRequest).status !== "open") {
    return NextResponse.json({ error: "This pickup was already claimed." }, { status: 409 });
  }

  const { error: claimErr } = await admin.from("volunteer_claims").insert({
    volunteer_id: user.id,
    pickup_id: pickupId,
    food_bank_id: (pickup as PickupRequest).suggested_food_bank_id,
  });
  if (claimErr) {
    // Unique constraint on pickup_id ⇒ someone beat us to it.
    return NextResponse.json({ error: "This pickup was already claimed." }, { status: 409 });
  }

  await admin.from("pickup_requests").update({ status: "claimed" }).eq("id", pickupId);

  // Email the donor that a volunteer accepted.
  await sendEmail({
    to: (pickup as PickupRequest).donor_email,
    subject: "A volunteer is picking up your donation 🚗",
    html: donorClaimedEmail({
      donorName: (pickup as PickupRequest).donor_name,
      volunteerName: profile.name || "A volunteer",
    }),
  });

  return NextResponse.json({ ok: true });
}
