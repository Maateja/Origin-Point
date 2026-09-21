import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
export async function POST(request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "A verified session is required." },
      { status: 401 },
    );
  const parsed = z
    .object({ password: z.string().min(8).max(128) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Use a password between 8 and 128 characters." },
      { status: 400 },
    );
  const { error } = await db.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return NextResponse.json(
      { error: "Your password could not be updated." },
      { status: 400 },
    );
  return NextResponse.json({ success: true });
}
