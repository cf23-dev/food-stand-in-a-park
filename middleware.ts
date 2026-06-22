import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only run on the routes that actually need an auth session. Public pages
  // (home, donate, food-banks) skip middleware entirely, so a middleware issue
  // can never take down the public site. These routes are also guarded at the
  // page level, so security doesn't depend on middleware alone.
  matcher: ["/admin/:path*", "/volunteer/dashboard/:path*"],
};
