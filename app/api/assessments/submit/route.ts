import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAssessment } from "@/lib/assessment-scoring.mjs";
export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to submit." },
      { status: 401 },
    );
  try {
    const body = z
      .object({
        attemptId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(3)),
      })
      .parse(await request.json());
    const admin = createAdminClient();
    const { data: attempt, error } = await admin
      .from("assessment_attempts")
      .select("*")
      .eq("id", body.attemptId)
      .eq("user_id", user.id)
      .single();
    if (error || !attempt)
      return NextResponse.json(
        { error: "Assessment not found for this account." },
        { status: 404 },
      );
    if (attempt.submitted_at)
      return NextResponse.json({ report: attempt.report });
    const result = scoreAssessment(attempt, body.answers);
    const { data: report, error: saveError } = await admin.rpc(
      "finish_assessment",
      { attempt: attempt.id, result },
    );
    if (saveError)
      return NextResponse.json(
        { error: "Your answers could not be saved. Please retry submission." },
        { status: 503 },
      );
    return NextResponse.json(
      { report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid assessment answers." },
      { status: 400 },
    );
  }
}
