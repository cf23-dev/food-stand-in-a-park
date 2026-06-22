import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/admin/export?type=pickups|volunteers|foodbanks  -> CSV download
export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const type = new URL(req.url).searchParams.get("type") ?? "pickups";
  const admin = createAdminClient();

  const table =
    type === "volunteers" ? "profiles" : type === "foodbanks" ? "food_banks" : "pickup_requests";
  const query =
    type === "volunteers" ? admin.from("profiles").select("*").eq("role", "volunteer") : admin.from(table).select("*");

  const { data, error } = await query;
  if (error || !data) {
    return new Response(JSON.stringify({ error: "Export failed." }), { status: 500 });
  }

  return new Response(toCsv(data as Record<string, unknown>[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}
