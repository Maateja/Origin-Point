import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to proceed." },
      { status: 401 },
    );
  }

  try {
    const body = z
      .object({
        attemptId: z.string().uuid(),
        violations: z
          .array(
            z.object({
              type: z.string(),
              reason: z.string(),
              timestamp: z.string(),
            }),
          )
          .default([]),
      })
      .parse(await request.json());

    const admin = createAdminClient();
    const { data: attempt, error } = await admin
      .from("assessment_attempts")
      .select("*")
      .eq("id", body.attemptId)
      .eq("user_id", user.id)
      .single();

    if (error || !attempt) {
      return NextResponse.json(
        { error: "Assessment not found for this account." },
        { status: 404 },
      );
    }

    if (attempt.submitted_at) {
      return NextResponse.json({ report: attempt.report });
    }

    const totalCount = Array.isArray(attempt.questions)
      ? attempt.questions.length
      : 10;

    const disqualifiedReport = {
      id: attempt.id,
      topicTitle: attempt.topic_title || "Assessment",
      scorePercent: 0,
      correctCount: 0,
      totalCount,
      targetPercent: attempt.pass_threshold || 70,
      disqualified: true,
      disqualificationReason:
        "Assessment terminated due to repeated proctoring violations (tab switching, focus loss, or copy attempts).",
      violations: body.violations,
      evaluatedQuestions: [],
      skillBreakdown: [],
      feedback:
        "This assessment has been permanently locked due to integrity violations under the institutional proctoring policy. Re-attempts are barred.",
    };

    const { data: report, error: saveError } = await admin.rpc(
      "finish_assessment",
      { attempt: attempt.id, result: disqualifiedReport },
    );

    if (saveError) {
      return NextResponse.json(
        { error: "Could not record disqualification." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { report: report || disqualifiedReport },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid request." },
      { status: 400 },
    );
  }
}
