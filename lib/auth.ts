import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Returns the signed-in user's profile, or null. For route handlers / RSC.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

// Guard for admin-only route handlers. Returns the profile or throws a Response.
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Admin access required." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return profile;
}
