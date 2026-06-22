import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";
import type { FoodBank, PickupRequest, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/volunteer/login?next=/admin");
  if (profile.role !== "admin") redirect("/volunteer/dashboard");

  const supabase = await createClient();
  const [pickupsRes, volunteersRes, banksRes] = await Promise.all([
    supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "volunteer").order("created_at", { ascending: false }),
    supabase.from("food_banks").select("*").order("name"),
  ]);

  return (
    <AdminDashboard
      pickups={(pickupsRes.data as PickupRequest[]) ?? []}
      volunteers={(volunteersRes.data as Profile[]) ?? []}
      foodBanks={(banksRes.data as FoodBank[]) ?? []}
    />
  );
}
