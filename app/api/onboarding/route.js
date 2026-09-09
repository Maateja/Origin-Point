import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/onboarding";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "You must be signed in to complete onboarding." }, { status: 401 });
    }

    const { data: profile, error: profileReadError } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      return NextResponse.json({ error: "Unable to verify your profile." }, { status: 500 });
    }

    if (profile?.role !== "student") {
      return NextResponse.json({ error: "Only student accounts can complete this onboarding flow." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please review your onboarding details and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      institution,
      department,
      academic_year,
      location,
      selectedSkills,
      selectedGoals,
    } = parsed.data;

    const { error: studentProfileError } = await supabase
      .from("student_profiles")
      .upsert(
        {
          id: user.id,
          institution,
          department,
          academic_year,
          location,
          self_reported_skills: selectedSkills,
          // Preserve multiple goals in the existing TEXT column without dropping IDs.
          career_goals: JSON.stringify(selectedGoals),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (studentProfileError) {
      console.error("Onboarding student profile error:", studentProfileError);
      return NextResponse.json({ error: "Could not save your onboarding details. Please try again." }, { status: 500 });
    }

    const { data: completedProfile, error: completionError } = await supabase
      .from("profiles")
      .update({
        location: location || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .eq("role", "student")
      .select("id")
      .single();

    if (completionError || !completedProfile) {
      console.error("Onboarding completion update error:", completionError);
      return NextResponse.json({ error: "Your details were saved, but onboarding could not be completed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding route error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while saving onboarding." }, { status: 500 });
  }
}
