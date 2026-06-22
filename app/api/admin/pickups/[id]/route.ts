import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { PickupStatus } from "@/lib/types";

const VALID: PickupStatus[] = ["open", "claimed", "completed", "cancelled"];

// PATCH — admin edits a pickup's status. Body: { status }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("pickup_requests").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
