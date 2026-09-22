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
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("learning_goals")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    if (error)
      return NextResponse.json(
        {
          error: ["42P01", "PGRST205"].includes(error.code)
            ? "Learning plans need the database update 202609220003_learning_goals.sql. Your other workspace features remain available."
            : "Could not load your learning goals. Please retry.",
        },
        { status: 503 },
      );
    rows.push(...data);
    if (data.length < 500) break;
  }
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
