import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// PATCH — approve/unapprove a volunteer. Body: { approved: boolean }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const { id } = await params;
  const { approved } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ approved: !!approved }).eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a volunteer (deletes auth user; profile cascades).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
