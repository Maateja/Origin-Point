import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAuthEmail } from "@/lib/auth-rate-limit";
import { z } from "zod";
export async function POST(request) {
  const parsed = z
    .object({ email: z.string().email().max(254) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  const email = parsed.data.email.trim().toLowerCase();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null);
  if (!origin || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    return NextResponse.json(
      {
        error:
          "Password recovery email is not configured. Contact the administrator.",
      },
      { status: 503 },
    );
  try {
    const admin = createAdminClient();
    if (!(await allowAuthEmail(admin, email)))
      return NextResponse.json(
        { error: "Too many email requests. Please try again in an hour." },
        { status: 429 },
      );
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const message =
      "If an account exists for that email, a recovery link has been sent.";
    if (!profile) return NextResponse.json({ success: true, message });
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error || !data?.properties?.hashed_token)
      throw new Error("Could not generate recovery token");
    const url = new URL("/auth/callback", origin);
    url.searchParams.set("token_hash", data.properties.hashed_token);
    url.searchParams.set("type", "recovery");
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Origin Point <" + process.env.RESEND_FROM_EMAIL + ">",
        to: email,
        subject: "Reset your Origin Point password",
        text:
          "Open this secure link to reset your password: " +
          url.toString() +
          "\n\nIf you did not request this, you can ignore this email.",
      }),
    });
    if (!sent.ok) throw new Error("Email delivery failed");
    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json(
      { error: "Recovery email could not be sent. Please try again later." },
      { status: 503 },
    );
  }
}
