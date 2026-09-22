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
  const [items, unread] = await Promise.all([
    db
      .from("notifications")
      .select("id,category,title,href,created_at,read_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  if (items.error || unread.error)
    return NextResponse.json(
      {
        error:
          "Notifications are unavailable. Apply migration 202609220010_notifications.sql if needed, then retry.",
      },
      { status: 503 },
    );
  return NextResponse.json(
    { items: items.data, unread: unread.count ?? 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
