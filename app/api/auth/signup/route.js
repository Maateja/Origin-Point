import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role = "student" } = body;
        const validRoles = ["student", "industry", "academician", "institution"];

        if (!email || !password || !validRoles.includes(role)) {
      return NextResponse.json(
            { error: "Valid email, password, and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = (name || "").trim();
    const admin = createAdminClient();

    // Check if user already exists
    const { data: userList, error: listError } = await admin.auth.admin.listUsers();
    if (!listError && userList?.users) {
      const existing = userList.users.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );
      if (existing) {
        const isGoogle = existing.app_metadata?.provider === "google";
        if (isGoogle) {
          return NextResponse.json(
            {
              error:
                "An account with this email was created using Google. Please sign in with Google, or use Forgot Password to create a password.",
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please log in or use Forgot Password.",
          },
          { status: 409 }
        );
      }
    }

    // Create user with email_confirm: true so it never triggers failing SMTP mailer
    const { data: createData, error: createError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedName,
          role: role,
        },
      });

    if (createError) {
      return NextResponse.json(
        { error: createError.message || "Failed to create user account." },
        { status: 400 }
      );
    }

    const user = createData.user;

    // Upsert into profiles table
    if (user?.id) {
      try {
        const profileValues = {
          id: user.id,
          email: normalizedEmail,
          full_name: normalizedName,
          role,
          updated_at: new Date().toISOString(),
        };
        if (role === "student") profileValues.onboarding_completed = false;

        await admin.from("profiles").upsert(profileValues, { onConflict: "id" });
      } catch (profileErr) {
        console.warn("Could not write profile during signup:", profileErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: role,
      },
    });
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during signup." },
      { status: 500 }
    );
  }
}
