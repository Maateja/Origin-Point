import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to open your workspace." },
      { status: 401 },
    );
  try {
    async function rows(table: string, order: string[]) {
      const all: any[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = db.from(table).select("*");
        for (const column of order) query = query.order(column);
        const { data, error } = await query.range(offset, offset + 499);
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) return all;
      }
    }
    const [
      { data: profile, error: profileError },
      { data: directory, error: directoryError },
      records,
      opportunities,
      applications,
      saved,
      memberships,
      reports,
      progress,
      evidence,
    ] = await Promise.all([
      db.from("profiles").select("*").eq("id", user.id).single(),
      db.rpc("platform_directory"),
      rows("portfolio_records", ["id"]),
      rows("opportunities", ["id"]),
      rows("applications", ["id"]),
      rows("saved_opportunities", ["opportunity_id"]),
      rows("institution_memberships", ["id"]),
      rows("assessment_reports", ["id"]),
      rows("learning_progress", [
        "user_id",
        "course_id",
        "module_id",
        "subtopic_id",
      ]),
      rows("skill_evidence", ["id"]),
    ]);
    let profileData = profile;
    if (profileError || !profileData) {
      const meta = (user.user_metadata as Record<string, any>) || {};
      const fallbackRole = ["student", "industry", "academician", "institution"].includes(
        meta.role,
      )
        ? meta.role
        : "student";
      const { data: newProfile } = await db
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name:
              meta.full_name ||
              meta.name ||
              user.email?.split("@")[0] ||
              "User",
            role: fallbackRole,
          },
          { onConflict: "id" },
        )
        .select("*")
        .single();
      profileData = newProfile || {
        id: user.id,
        email: user.email,
        full_name: meta.full_name || meta.name || "User",
        role: fallbackRole,
      };
    }
    const directoryList = directoryError ? [] : (directory ?? []);
    const names = new Map(
      directoryList.map((person: any) => [person.id, person.full_name]),
    );
    return NextResponse.json(
      {
        profile: profileData,
        evidence,
        directory: directory ?? [],
        records,
        memberships,
        progress,
        opportunities: opportunities
          .map((o) => ({
            id: o.id,
            ownerId: o.owner_id,
            title: o.title,
            company: o.company,
            type: o.type,
            audience: o.audience,
            location: o.location,
            workMode: o.work_mode,
            duration: o.duration,
            stipend: o.stipend,
            deadline: o.deadline,
            skills: o.skills,
            description: o.description,
            seats: o.seats,
            status: o.status,
            publishedAt: o.created_at,
            requiresAssessment: !!o.requires_assessment,
            assessmentCutoff: o.assessment_cutoff ?? 70,
          }))
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        applications: applications
          .map((a) => ({
            id: a.id,
            opportunityId: a.opportunity_id,
            applicantId: a.applicant_id,
            studentName: names.get(a.applicant_id) || "Applicant",
            appliedAt: a.created_at,
            matchScore: a.match_score,
            status: a.status,
            nextStep: a.next_step,
            feedback: a.feedback,
            progress: a.progress,
            updatedAt: a.updated_at,
            assessmentReportId: a.assessment_report_id,
            assessmentScore: a.assessment_score,
            assessmentPassed: !!a.assessment_passed,
            proctoringTrust: a.proctoring_trust || "Verified",
            proctoringViolations: a.proctoring_violations ?? 0,
          }))
          .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
        savedOpportunityIds: saved.map((s) => s.opportunity_id),
        reports: reports.map((r) => ({ ...r.report, userId: r.user_id })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: any) {
    console.error("API /api/platform error:", error);
    const setup = [
      "42P01",
      "42703",
      "PGRST202",
      "PGRST205",
      "PGRST204",
    ].includes(error.code);
    return NextResponse.json(
      {
        error: setup
          ? "Your workspace database needs its latest update. Ask the project administrator to complete Supabase setup."
          : "Your workspace could not be loaded. Please retry.",
      },
      { status: setup ? 503 : 500 },
    );
  }
}
