import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    // Check if user exists
    const { data: userList, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json(
        { error: listError.message || "Failed to search user directory." },
        { status: 500 }
      );
    }

    const user = userList?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account found with this email address. Please make sure the email is typed correctly or create a new account.",
        },
        { status: 404 }
      );
    }

    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const redirectUrl = `${protocol}://${host}/auth/callback?next=/reset-password`;

    // generateLink only creates a URL; resetPasswordForEmail also dispatches
    // it through the SMTP provider configured in Supabase Auth.
    const supabase = await createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: redirectUrl }
    );

    if (resetError) {
      return NextResponse.json(
        {
          error:
            resetError.message ||
            "Failed to send the password reset email. Please try again.",
        },
        { status: 500 }
      );
    }

    const isGoogle = user.app_metadata?.provider === "google";

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      isGoogle: isGoogle,
      message: isGoogle
        ? "We sent a password recovery email. It lets you create a password for this Google account."
        : "Password recovery email sent successfully.",
    });
  } catch (err) {
    console.error("Forgot password route error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
