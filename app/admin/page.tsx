import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { AdminDashboard, type FeedbackRow } from "@/components/AdminDashboard";
import type { FoodBank, PickupRequest, Profile } from "@/lib/types";
import type { HourEntry } from "@/lib/hours";
import type { FoodStandRequest } from "@/lib/food-stand";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/volunteer/login?next=/admin");
  if (profile.role !== "admin") redirect("/volunteer/dashboard");

  const supabase = await createClient();
  const [pickupsRes, volunteersRes, banksRes, feedbackRes, hoursRes, standsRes] = await Promise.all([
    supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "volunteer").order("created_at", { ascending: false }),
    supabase.from("food_banks").select("*").order("name"),
    supabase
      .from("feedback")
      .select("*, pickup:pickup_requests(food_type)")
      .order("created_at", { ascending: false }),
    supabase.from("volunteer_hours").select("*, claim:volunteer_claims(completed_at, pickup:pickup_requests(food_type,address))").neq("status", "draft").order("updated_at", { ascending: false }),
    supabase.from("food_stand_requests").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminDashboard
      pickups={(pickupsRes.data as PickupRequest[]) ?? []}
      volunteers={(volunteersRes.data as Profile[]) ?? []}
      foodBanks={(banksRes.data as FoodBank[]) ?? []}
      feedback={(feedbackRes.data as unknown as FeedbackRow[]) ?? []}
      hourEntries={(hoursRes.data as HourEntry[]) ?? []}
      hoursError={hoursRes.error ? "Hours could not be loaded. Run supabase/migration-003-volunteer-hours.sql in Supabase, then refresh." : undefined}
      adminName={profile.name}
      adminId={profile.id}
      foodStandRequests={(standsRes.data as FoodStandRequest[]) ?? []}
      foodStandError={standsRes.error ? "Food stand requests could not be loaded. Check that supabase/migration-004-food-stand-requests.sql has been run in Supabase, then refresh." : undefined}
    />
  );
}
