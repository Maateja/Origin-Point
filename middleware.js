import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const VALID_ROLES = ["student", "industry", "academician", "institution"];
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/select-role",
  "/onboarding",
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function copyCookies(source, target) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  return target;
}

export async function middleware(request) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isDashboardRoute = VALID_ROLES.some(
    (role) => pathname === `/${role}` || pathname.startsWith(`/${role}/`)
  );

  let supabase = null;
  let user = null;

  try {
    supabase = createMiddlewareClient(request, response);
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (authErr) {
    console.warn("Middleware Supabase auth error:", authErr);
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/onboarding" && user && supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role !== "student") {
          const destination = profile?.role && VALID_ROLES.includes(profile.role)
            ? `/${profile.role}`
            : "/select-role";
          return copyCookies(response, NextResponse.redirect(new URL(destination, request.url)));
        }

        if (profile.onboarding_completed === true) {
          return copyCookies(response, NextResponse.redirect(new URL("/student", request.url)));
        }
      } catch (e) {
        console.warn("Middleware onboarding check error:", e);
      }
    }

    return response;
  }

  if (!isDashboardRoute) {
    return response;
  }

  if (!user) {
    return copyCookies(response, NextResponse.redirect(new URL("/login", request.url)));
  }

  let profile = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    } catch (e) {
      console.warn("Middleware profile fetch error:", e);
    }
  }

  if (!profile?.role || !VALID_ROLES.includes(profile.role)) {
    return copyCookies(response, NextResponse.redirect(new URL("/select-role", request.url)));
  }

  if (pathname === "/student" || pathname.startsWith("/student/")) {
    if (profile.role !== "student") {
      return copyCookies(response, NextResponse.redirect(new URL(`/${profile.role}`, request.url)));
    }

    if (profile.onboarding_completed !== true) {
      return copyCookies(response, NextResponse.redirect(new URL("/onboarding", request.url)));
    }
  } else {
    const requestedRole = VALID_ROLES.find(
      (role) => pathname === `/${role}` || pathname.startsWith(`/${role}/`)
    );
    if (requestedRole && requestedRole !== profile.role) {
      return copyCookies(response, NextResponse.redirect(new URL(`/${profile.role}`, request.url)));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
