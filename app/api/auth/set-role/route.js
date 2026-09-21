import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ROLES = ["student", "industry", "academician", "institution"];

export async function POST(request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Please choose a valid role." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Update profiles using admin service_role client to bypass client RLS/trigger lock
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Failed to update profile role:", profileError);
      return NextResponse.json(
        { error: "Could not update account role. Please retry." },
        { status: 500 }
      );
    }

    // Also persist into auth user_metadata
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role,
      },
    });

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("set-role error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
