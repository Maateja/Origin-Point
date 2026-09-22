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
    async function rows(table: string) {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db
          .from(table)
          .select("*")
          .order("created_at")
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        result.push(...data);
        if (data.length < 500) return result;
      }
    }
    const [
      events,
      milestones,
      logs,
      arrangements,
      supervisors,
      reports,
      reviews,
      completions,
      certificates,
    ] = await Promise.all([
      rows("application_events"),
      rows("internship_milestones"),
      rows("internship_logs"),
      rows("internship_arrangements"),
      rows("internship_supervisors"),
      rows("internship_reports"),
      rows("internship_report_reviews"),
      rows("internship_completions"),
      rows("internship_certificates"),
    ]);
    return NextResponse.json(
      {
        events,
        milestones,
        logs,
        arrangements,
        supervisors,
        reports,
        reviews,
        completions,
        certificates,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: ["42P01", "PGRST205"].includes(error.code)
          ? "Application tracking needs the latest migration (202609220007_completion_certificates.sql)."
          : "Could not load application tracking. Please retry.",
      },
      { status: 503 },
    );
  }
}
