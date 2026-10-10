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

  // Unlike optional pickup notifications, this email IS the submission. Never
  // report success when delivery is unconfigured or rejected by the provider.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    return NextResponse.json({ error: "The form is temporarily unavailable. Please email contact@foodstandinapark.org to get started." }, { status: 503 });
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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Your interest could not be sent. Please try again or email contact@foodstandinapark.org." }, { status: 502 });
  }
}
