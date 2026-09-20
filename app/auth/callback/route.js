import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["student", "industry", "academician", "institution"];

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type"); // "email" | "recovery" | "signup" | etc.
  const nextParam = searchParams.get("next");
  const mode = searchParams.get("mode") || "login";
  const queryRole = searchParams.get("role");

  const supabase = await createClient();

  // ── A) OTP / Magic-link email verification (token_hash flow) ────────────
  // This is triggered when the user clicks the link in the OTP email instead
  // of typing the 6-digit code directly in the app.
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type, // "email" | "signup" | "recovery" | "invite"
    });

    if (!error && data?.user) {
      const { user } = data;

      // Password recovery — redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      return await handleAuthSuccess({ supabase, user, origin, mode, queryRole, nextParam });
    }

    // Token verification failed
    const errorDescription = error?.message || "auth_failed";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  // ── B) OAuth / PKCE code exchange (Google, etc.) ─────────────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const { user } = data;

      // If this was a password recovery callback
      if (nextParam?.startsWith("/reset-password")) {
        return NextResponse.redirect(`${origin}${nextParam}`);
      }

      return await handleAuthSuccess({ supabase, user, origin, mode, queryRole, nextParam });
    }
  }

  // ── C) Fallback — check if user already has a valid session ─────────────
  // (handles PKCE verifier mismatch, double-click on email link, etc.)
  try {
    const { data: fallbackData } = await supabase.auth.getUser();
    if (fallbackData?.user) {
      const { data: fallbackProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", fallbackData.user.id)
        .maybeSingle();

      const fallbackRole = fallbackProfile?.role;
      if (fallbackRole && VALID_ROLES.includes(fallbackRole)) {
        return NextResponse.redirect(`${origin}/${fallbackRole}`);
      }
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

// ─── Shared post-auth routing helper ─────────────────────────────────────────
async function handleAuthSuccess({ supabase, user, origin, mode, queryRole, nextParam }) {
  // Check existing profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const resolvedRole =
    existingProfile?.role ||
    (mode === "signup" ? queryRole || user.user_metadata?.role : null);

  // Login flow with no registered role → pick a role
  if (mode === "login" && (!resolvedRole || !VALID_ROLES.includes(resolvedRole))) {
    return NextResponse.redirect(`${origin}/select-role?intent=signup`);
  }

  const assignedRole =
    resolvedRole && VALID_ROLES.includes(resolvedRole)
      ? resolvedRole
      : queryRole || "student";

  const userFullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    existingProfile?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  // Upsert base profile
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

  if (nextParam && !nextParam.startsWith(`/${assignedRole}`)) {
    return NextResponse.redirect(`${origin}${nextParam}`);
  }

  return NextResponse.redirect(`${origin}/${assignedRole}`);
}
