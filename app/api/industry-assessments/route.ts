import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  industryDefinitionSchema,
  assessmentDatabaseError,
} from "@/lib/industry-assessment-schema";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to view assessments." },
      { status: 401 },
    );
  const { data, error } = await db
    .from("industry_assessments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    const failure = assessmentDatabaseError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
  return NextResponse.json(
    { assessments: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to author assessments." },
      { status: 401 },
    );
  const body = industryDefinitionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success)
    return NextResponse.json(
      {
        error: body.error.issues[0]?.message || "Check the assessment fields.",
      },
      { status: 400 },
    );
  const { data, error } = await db.rpc("save_industry_assessment", {
    definition: body.data,
  });
  if (error) {
    const failure = assessmentDatabaseError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
  return NextResponse.json(
    { id: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
