import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAuthEmail } from "@/lib/auth-rate-limit";
import { z } from "zod";

const ROLE_LABELS = {
  student: "Student",
  industry: "Industry Professional",
  academician: "Academician",
  institution: "Institution Administrator",
};

const ROLE_COLORS = {
  student: { bg: "#eef2ff", accent: "#6366f1", label: "#4338ca" },
  industry: { bg: "#fffbeb", accent: "#f59e0b", label: "#b45309" },
  academician: { bg: "#ecfdf5", accent: "#10b981", label: "#047857" },
  institution: { bg: "#eff6ff", accent: "#3b82f6", label: "#1d4ed8" },
};

function buildEmailHtml({ name, role, otp, mode }) {
  const roleLabel = ROLE_LABELS[role] || null;
  const colors = ROLE_COLORS[role] || {
    bg: "#f5f5ff",
    accent: "#6366f1",
    label: "#4338ca",
  };
  const safeName = (name || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
  name = safeName;
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const action =
    mode === "signup"
      ? "create your account"
      : mode === "recovery"
        ? "reset your password"
        : "sign in";

  const roleBadge = roleLabel
    ? `<div style="display:inline-block;margin:0 0 20px 0;padding:6px 14px;background:${colors.bg};border:1px solid ${colors.accent}40;border-radius:100px;">
        <span style="font-family:sans-serif;font-size:12px;font-weight:600;color:${colors.label};letter-spacing:0.3px;">
          ${roleLabel}
        </span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Origin Point code</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">
                Origin<span style="color:#6366f1;">·</span>Point
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:40px 40px 32px 40px;box-shadow:0 1px 4px rgba(0,0,0,0.06),0 4px 24px rgba(0,0,0,0.04);">

              <!-- Greeting -->
              <p style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#6b7280;line-height:1.6;">
                Here's your one-time code to ${action} on Origin Point.
                Use the latest code; older codes may expire.
              </p>

              <!-- Role badge -->
              ${roleBadge}

              <!-- OTP Code -->
              <div style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border:1px solid #c4b5fd40;border-radius:16px;padding:28px 20px;text-align:center;margin:0 0 28px 0;">
                <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:#7c3aed;letter-spacing:1.5px;text-transform:uppercase;">
                  Verification Code
                </p>
                <div style="font-family:'Courier New',Courier,monospace;font-size:44px;font-weight:800;letter-spacing:14px;color:#111827;line-height:1;">
                  ${otp}
                </div>
              </div>

              <!-- Instructions -->
              <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;line-height:1.6;">
                Enter this code in the Origin Point app to continue.
                Do not share this code with anyone.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;" />

              <!-- Footer note -->
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0 0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © Origin Point · All rights reserved
              </p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#d1d5db;">
                Sent to ${name ? `<strong style="color:#6b7280;">${name}</strong>` : "you"} for Origin Point verification
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const input = z
      .object({
        email: z.string().email().max(254),
        name: z.string().max(160).optional(),
        role: z
          .enum(["student", "industry", "academician", "institution"])
          .optional(),
        mode: z.enum(["signup", "login", "recovery"]).default("login"),
      })
      .safeParse(body);
    if (!input.success)
      return NextResponse.json(
        { error: "Enter valid account details." },
        { status: 400 },
      );
    const { email, name, role, mode } = input.data;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Contact the project administrator.",
        },
        { status: 500 },
      );
    }

    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();
    if (!(await allowAuthEmail(admin, normalizedEmail)))
      return NextResponse.json(
        { error: "Too many email requests. Please try again in an hour." },
        { status: 429 },
      );

    let displayName = name?.trim() || null;
    let displayRole = role || null;

    // For login and recovery: look up existing user's profile to get their name and role
    if (mode === "login" || mode === "recovery") {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, role")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json(
          { error: "No account found for this email. Please sign up first." },
          { status: 404 },
        );
      }

      displayName = profile.full_name || normalizedEmail.split("@")[0];
      displayRole = profile.role || null;
    }

    // Generate OTP via Supabase admin
    const linkType = mode === "recovery" ? "recovery" : "magiclink";
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: linkType,
        email: normalizedEmail,
        options: {
          data: {
            full_name: displayName,
            role: displayRole,
          },
        },
      });

    if (linkError) {
      console.error("Supabase generateLink error:", linkError);
      return NextResponse.json(
        { error: linkError.message || "Failed to generate verification code." },
        { status: 400 },
      );
    }

    const otpCode = linkData?.properties?.email_otp;
    if (!otpCode) {
      return NextResponse.json(
        { error: "Failed to generate OTP code. Please try again." },
        { status: 500 },
      );
    }

    // Send custom email via Resend
    const emailHtml = buildEmailHtml({
      name: displayName,
      role: displayRole,
      otp: otpCode,
      mode,
    });

    const fromAddress = process.env.RESEND_FROM_EMAIL;
    const emailSubject =
      mode === "recovery"
        ? `${otpCode} – Your Origin Point password reset code`
        : `${otpCode} – Your Origin Point verification code`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Origin Point <${fromAddress}>`,
        to: normalizedEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.json().catch(() => ({}));
      console.error("Resend error:", resendError);
      return NextResponse.json(
        { error: resendError?.message || "Failed to send verification email." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-otp route error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
