import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assessmentDatabaseError } from "@/lib/industry-assessment-schema";
export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to take an assessment." },
      { status: 401 },
    );
  const body = z
    .object({ assessmentId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: "Choose a valid assessment." },
      { status: 400 },
    );
  const { data, error } = await db.rpc("start_industry_assessment", {
    assessment: body.data.assessmentId,
  });
  if (error) {
    const failure = assessmentDatabaseError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
