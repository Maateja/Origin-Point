import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    async function rows(table: string, select = "*") {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db
          .from(table)
          .select(select)
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        result.push(...data);
        if (data.length < 500) return result;
      }
    }
    const [programs, enrollments, submissions, reviews] = await Promise.all([
      rows("learning_programs", "*, opportunity:opportunities(*)"),
      rows("program_enrollments"),
      rows("program_submissions"),
      rows("program_reviews"),
    ]);
    return NextResponse.json(
      { programs, enrollments, submissions, reviews },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Learning programs could not load. Apply migration 202609220008_learning_programs.sql if not yet applied, then retry.",
      },
      { status: 503 },
    );
  }
}
