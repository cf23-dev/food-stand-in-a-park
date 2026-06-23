import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconUser } from "./Illustrations";

// Server component: reads the session so the header reflects auth state.
export async function SiteHeader() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    // If the auth check fails for any reason, fall back to the signed-out header.
    signedIn = false;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-800">
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <span>Food Stand in a Park</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/donate" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Donate
          </Link>
          <Link href="/food-banks" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:block">
            Food banks
          </Link>

          {signedIn ? (
            <Link
              href="/volunteer/dashboard"
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-2"
            >
              <IconUser className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link href="/volunteer/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Volunteer
              </Link>
              <Link href="/volunteer/login" className="btn-primary px-3 py-2">
                Sign in
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
