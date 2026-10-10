import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { foodStandInterestSchema, foodStandInterestEmail } from "@/lib/food-stand";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Please submit from this website." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Please sign in to send your interest." }, { status: 401 });
  }
  const parsed = foodStandInterestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  }

  const { data: request, error: saveError } = await supabase
    .from("food_stand_requests")
    .insert({ ...parsed.data, volunteer_id: user.id, email: user.email })
    .select("id")
    .single();
  if (saveError) {
    return NextResponse.json({ error: "Your request could not be saved. Please try again or email contact@foodstandinapark.org." }, { status: 500 });
  }

  // The saved request is the source of truth. Email is an optional alert;
  // failures must not invite a duplicate submission of an already saved request.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM || "Food Stand in a Park <onboarding@resend.dev>",
      to: "contact@foodstandinapark.org",
      replyTo: user.email,
      subject: "Food stand opportunity: new volunteer interest",
      html: foodStandInterestEmail(parsed.data, user.email),
    });
    if (error) throw new Error("Email provider rejected the submission.");
    return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
  } catch {
    console.error("Food stand request saved, but email notification failed.");
    return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
  }
}
