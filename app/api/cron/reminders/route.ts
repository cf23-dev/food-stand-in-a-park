import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, pickupReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Called on a schedule (GitHub Actions, every ~15 min). Sends a reminder to the
// volunteer + donor for any claimed pickup whose start time is within the next
// 2 hours and that hasn't been reminded yet.
type ReminderRow = {
  id: string;
  pickup: {
    food_type: string;
    address: string;
    donor_name: string;
    donor_email: string;
    earliest_pickup: string | null;
  } | null;
  volunteer: { name: string | null; email: string } | null;
};

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse if unconfigured
  const header = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("volunteer_claims")
    .select(
      "id, reminder_sent_at, completed_at, " +
        "pickup:pickup_requests(food_type,address,donor_name,donor_email,earliest_pickup), " +
        "volunteer:profiles(name,email)"
    )
    .is("reminder_sent_at", null)
    .is("completed_at", null);

  if (error) {
    console.error("reminders query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ReminderRow[];
  const now = Date.now();
  let sent = 0;

  for (const row of rows) {
    const p = row.pickup;
    if (!p?.earliest_pickup) continue;
    const t = new Date(p.earliest_pickup).getTime();
    // Within the next 2 hours and not already in the past.
    if (!(t > now && t - now <= TWO_HOURS_MS)) continue;

    if (row.volunteer?.email) {
      await sendEmail({
        to: row.volunteer.email,
        subject: "Reminder: your pickup is in ~2 hours 🚗",
        html: pickupReminderEmail({
          role: "volunteer",
          name: row.volunteer.name ?? undefined,
          foodType: p.food_type,
          address: p.address,
        }),
      });
    }
    if (p.donor_email) {
      await sendEmail({
        to: p.donor_email,
        subject: "Reminder: your food pickup is in ~2 hours 🥕",
        html: pickupReminderEmail({
          role: "donor",
          name: p.donor_name,
          foodType: p.food_type,
          address: p.address,
        }),
      });
    }

    await admin
      .from("volunteer_claims")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);
    sent++;
  }

  return NextResponse.json({ ok: true, checked: rows.length, sent });
}
