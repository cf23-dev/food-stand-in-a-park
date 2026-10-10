"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (uses the public anon key + RLS).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Sign-in is unavailable because authentication has not been configured for this site.");
  }
  return createBrowserClient(
    url.replace(/\/+$/, "").replace(/\/rest\/v1$/, ""),
    key
  );
}
