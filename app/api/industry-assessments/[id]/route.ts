import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assessmentDatabaseError } from "@/lib/industry-assessment-schema";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid assessment ID." },
      { status: 400 },
    );
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to view your question bank." },
      { status: 401 },
    );
  const { data, error } = await db.rpc("industry_assessment_definition", {
    assessment: id,
  });
  if (error) {
    const failure = assessmentDatabaseError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
  return NextResponse.json(
    { definition: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
