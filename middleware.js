import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const VALID_ROLES = ["student", "industry", "academician", "institution"];

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/student",
  "/industry",
  "/academician",
  "/institution",
  "/onboarding",
];

// Routes only for unauthenticated users (redirect to dashboard if already logged in)
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Create a response object we can modify (needed for cookie refreshing)
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Build the Supabase client that reads/writes cookies via the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session (IMPORTANT: do NOT remove — keeps session alive)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;
  function redirect(url) {
    const destination = NextResponse.redirect(url);
    response.cookies
      .getAll()
      .forEach((cookie) => destination.cookies.set(cookie));
    return destination;
  }

  // ── Redirect authenticated users away from login/signup ─────────────────
  if (isAuthenticated && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    // Try to send them to their dashboard
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role && VALID_ROLES.includes(profile.role)) {
        return redirect(new URL(`/${profile.role}`, request.url));
      }
    } catch {}
    return redirect(new URL("/select-role", request.url));
  }

  // ── Protect dashboard routes ─────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirect(loginUrl);
  }

  // A valid session alone must not grant access to another role's workspace.
  // This check protects direct URL entry as well as navigation hidden in the UI.
  const requestedDashboardRole = VALID_ROLES.find(
    (role) => pathname === `/${role}` || pathname.startsWith(`/${role}/`),
  );

  if (isAuthenticated && requestedDashboardRole) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const assignedRole = profile?.role;
      if (!assignedRole || !VALID_ROLES.includes(assignedRole)) {
        return redirect(new URL("/select-role", request.url));
      }

      if (assignedRole !== requestedDashboardRole) {
        return redirect(new URL(`/${assignedRole}`, request.url));
      }
    } catch {
      // If the role lookup is temporarily unavailable, never guess at access.
      return redirect(new URL("/select-role", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public assets
     * - API routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
