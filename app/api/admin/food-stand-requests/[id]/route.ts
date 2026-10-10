import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { foodStandStatusSchema } from "@/lib/food-stand";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Could not verify admin access." }, { status: 500 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }
  const parsed = foodStandStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose New, Contacted, or Closed." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("food_stand_requests")
    .update({ status: parsed.data.status }).eq("id", id).select("id,status").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update this request." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  return NextResponse.json(data);
}
