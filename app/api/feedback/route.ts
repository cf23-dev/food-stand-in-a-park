import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/validation";
import { sendEmail, adminFeedbackEmail } from "@/lib/email";
import type { PickupRequest } from "@/lib/types";

// POST /api/feedback — public donor feedback submission (via emailed link).
// Stores the feedback (service role) and emails the nonprofit a copy.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid feedback." },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const admin = createAdminClient();

  // Look up the pickup for context (food type + donor email).
  const { data: pickup } = await admin
    .from("pickup_requests")
    .select("food_type, donor_email")
    .eq("id", input.pickup_id)
    .single();
  const p = pickup as Pick<PickupRequest, "food_type" | "donor_email"> | null;

  const { error } = await admin.from("feedback").upsert(
    {
      pickup_id: input.pickup_id,
      donor_email: p?.donor_email ?? null,
      rating: input.rating,
      comment: input.comment || null,
    },
    { onConflict: "pickup_id" }
  );
  if (error) {
    console.error("feedback insert failed:", error);
    return NextResponse.json({ error: "Could not save your feedback." }, { status: 500 });
  }

  // Notify the nonprofit (best-effort).
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `New donor feedback (${input.rating}/5)`,
      html: adminFeedbackEmail({
        rating: input.rating,
        comment: input.comment || "",
        donorEmail: p?.donor_email ?? "unknown",
        foodType: p?.food_type ?? "—",
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
