import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["student", "industry", "academician", "institution"];

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  const supabase = await createClient();

  // If there's no code, check if we have a session already (handles PKCE verifier mismatch)
  if (!code) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      const dashboard = profile?.role === "student" && profile.onboarding_completed !== true
        ? "/onboarding"
        : profile?.role
          ? `/${profile.role}`
          : "/select-role";
      return NextResponse.redirect(`${origin}${nextParam || dashboard}`);
    }
    
    const errorDescription = searchParams.get("error_description") || "auth_failed";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error && data?.user) {
    const { user } = data;

    // 1. If this was a password recovery callback, forward directly to reset-password
    if (nextParam && nextParam.startsWith("/reset-password")) {
      return NextResponse.redirect(`${origin}${nextParam}`);
    }

    // 2. Check if user already has an established profile and role
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role, full_name, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const mode = searchParams.get("mode") || "login";
    const queryRole = searchParams.get("role");

    const resolvedRole =
      existingProfile?.role ||
      (mode === "signup" ? (queryRole || user.user_metadata?.role) : null);

    // If user came through LOGIN flow but has no registered profile/role, redirect to role selection
    if (mode === "login" && (!resolvedRole || !VALID_ROLES.includes(resolvedRole))) {
      return NextResponse.redirect(`${origin}/select-role?intent=signup`);
    }

    const assignedRole = resolvedRole && VALID_ROLES.includes(resolvedRole) ? resolvedRole : (queryRole || "student");
    const userFullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      existingProfile?.full_name ||
      user.email?.split("@")[0] ||
      "User";

    // 3. Upsert base profile info while preserving or updating role
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: userFullName,
        avatar_url:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null,
        role: assignedRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 4. Determine destination. Recovery was handled before profile routing.
    if (assignedRole === "student" && existingProfile?.onboarding_completed !== true) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    if (nextParam && nextParam !== "/student") {
      return NextResponse.redirect(`${origin}${nextParam}`);
    }

    return NextResponse.redirect(`${origin}/${assignedRole}`);
  }

  // --- FALLBACK: exchangeCodeForSession failed (e.g. PKCE verifier mismatch on first attempt) ---
  // If the user already has a valid session (from a just-completed signup or prior auth),
  // redirect them to their dashboard instead of bouncing them to the error/login page.
  try {
    const { data: fallbackData } = await supabase.auth.getUser();
    if (fallbackData?.user) {
      const { data: fallbackProfile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", fallbackData.user.id)
        .maybeSingle();

      const fallbackRole = fallbackProfile?.role;
      if (fallbackRole && VALID_ROLES.includes(fallbackRole)) {
        // Already authenticated — send straight to dashboard
        const destination = fallbackRole === "student" && fallbackProfile.onboarding_completed !== true
          ? "/onboarding"
          : `/${fallbackRole}`;
        return NextResponse.redirect(`${origin}${destination}`);
      }
      // Authenticated but no role yet — pick a role
      return NextResponse.redirect(`${origin}/select-role`);
    }
  } catch (_) {
    // getUser failed, fall through to error redirect
  }

  const errorDescription = searchParams.get("error_description") || "auth_failed";
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(errorDescription)}`
  );
}
