import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VolunteerDashboard } from "@/components/VolunteerDashboard";
import type { FoodBank, Notification, PickupRequest, Profile, VolunteerClaim } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/volunteer/login?next=/volunteer/dashboard");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Open pickups, the volunteer's own claims, food banks, and notifications.
  const [openRes, claimsRes, banksRes, notifRes] = await Promise.all([
    supabase.from("pickup_requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("volunteer_claims").select("*, pickup:pickup_requests(*), food_bank:food_banks(*)").eq("volunteer_id", user.id).order("claimed_at", { ascending: false }),
    supabase.from("food_banks").select("*"),
    supabase.from("notifications").select("*").eq("volunteer_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <VolunteerDashboard
      profile={(profile as Profile) ?? null}
      openPickups={(openRes.data as PickupRequest[]) ?? []}
      claims={(claimsRes.data as (VolunteerClaim & { pickup: PickupRequest; food_bank: FoodBank | null })[]) ?? []}
      foodBanks={(banksRes.data as FoodBank[]) ?? []}
      notifications={(notifRes.data as Notification[]) ?? []}
    />
  );
}
