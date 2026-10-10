import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { hourCommandSchema, type HourEntry } from "@/lib/hours";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  // Bound vector payloads before parsing. Database validation also protects direct RPC calls.
  const raw = await req.text();
  if (raw.length > 300000) return NextResponse.json({ error: "Signature is too large. Please clear it and try again." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = hourCommandSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form fields." }, { status: 400 });
  const { data, error } = await supabase.rpc("volunteer_hour_command", { command: parsed.data });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 :
      ["23505", "40001"].includes(error.code) ? 409 : error.code.startsWith("22") || error.code === "23514" ? 400 : 500;
    const message = error.code === "23505" ? "These hours already exist. Check your hours list for this pickup or refresh before trying again." :
      status === 500 ? "Hours could not be saved. Please try again or contact an administrator." : error.message;
    return NextResponse.json({ error: message }, { status });
  }
  const entry = data as HourEntry;
  if (parsed.data.action === "sign" || parsed.data.action === "return") {
    // Notifications are already committed by the RPC; email is an optional extra.
    try {
      const { data: volunteer } = await createAdminClient().from("profiles").select("email").eq("id", entry.volunteer_id).single();
      if (volunteer?.email) {
        await sendEmail({ to: volunteer.email,
          subject: parsed.data.action === "sign" ? "Your volunteer hours are signed" : "Your volunteer hours need changes",
          html: "<p>Your volunteer hour request has been reviewed. Sign in to your Food Stand in a Park volunteer dashboard and open Hours &amp; signatures to see the result.</p>",
        });
      }
    } catch (err) { console.error("Hour review email failed:", err); }
  }
  return NextResponse.json({ entry });
}
