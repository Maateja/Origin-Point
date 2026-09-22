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
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        result.push(...data);
        if (data.length < 500) return result;
      }
    }
    const [interviews, offers] = await Promise.all([
      rows("application_interviews"),
      rows("placement_offers"),
    ]);
    return NextResponse.json(
      { interviews, offers },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Recruitment tracking could not load. Apply migration 202609220009_recruitment_workflow.sql if needed, then retry.",
      },
      { status: 503 },
    );
  }
}
