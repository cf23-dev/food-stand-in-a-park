import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail, donorFeedbackRequestEmail } from "@/lib/email";
import type { PickupRequest } from "@/lib/types";

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

  // Ask the donor for feedback (best-effort).
  const { data: pickup } = await admin
    .from("pickup_requests")
    .select("donor_name, donor_email, food_type")
    .eq("id", pickupId)
    .single();
  const p = pickup as Pick<PickupRequest, "donor_name" | "donor_email" | "food_type"> | null;
  if (p?.donor_email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: p.donor_email,
      subject: "How did your food donation go? 🥕",
      html: donorFeedbackRequestEmail({
        donorName: p.donor_name,
        foodType: p.food_type,
        url: `${siteUrl}/feedback/${pickupId}`,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
