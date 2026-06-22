import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Shape of the array Supabase passes to the cookies `setAll` callback.
type CookieToSet = { name: string; value: string; options: CookieOptions };

// Refreshes the Supabase auth session on every request and guards
// protected routes (/volunteer/dashboard*, /admin*).
export async function updateSession(request: NextRequest) {
  try {
    return await runSession(request);
  } catch (err) {
    // Never let a middleware failure 500 the page — just continue without a
    // session refresh. Protected pages still enforce auth at the page level.
    console.error("middleware updateSession failed:", err);
    return NextResponse.next({ request });
  }
}

async function runSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, ""),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/volunteer/dashboard") || pathname.startsWith("/admin");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/volunteer/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Admin gate: must have an admin profile.
  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/volunteer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
