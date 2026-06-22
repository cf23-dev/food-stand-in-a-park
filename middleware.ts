import { NextResponse, type NextRequest } from "next/server";

// NOTE: We intentionally do NOT run Supabase in middleware. Middleware executes
// on Vercel's Edge runtime, where @supabase/supabase-js uses a Node API
// (process.version) that crashed the function (MIDDLEWARE_INVOCATION_FAILED).
//
// Auth is enforced where it actually matters — in each protected page's server
// component, which runs on the Node runtime:
//   - app/admin/page.tsx              → getProfile() + redirect() (admin only)
//   - app/volunteer/dashboard/page.tsx → getUser() + redirect() (must be signed in)
// So this middleware is currently a safe pass-through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/volunteer/dashboard/:path*"],
};
