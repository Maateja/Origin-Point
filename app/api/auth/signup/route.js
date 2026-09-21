import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Complete the email verification flow on the signup page to create an account.",
    },
    { status: 410 },
  );
}
