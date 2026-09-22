import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ASSESSMENT_PROMPT_VERSION,
  assessmentSystemPrompt,
  validateAssessmentInput,
  validateGeneratedQuestions,
} from "@/lib/ai/assessment-prompts.mjs";
export const dynamic = "force-dynamic";
const requests = new Map<string, number>();
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "Please sign in." }, 401);
  const { data: profile, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || profile?.role !== "industry")
    return reply(
      { error: "Only industry authors can generate screening drafts." },
      403,
    );
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 16000)
      return reply({ error: "Assessment brief is too large." }, 413);
    input = validateAssessmentInput(JSON.parse(raw));
  } catch {
    return reply(
      {
        error:
          "Provide consent, a role title, 1–30 skills, a supported level and 1–15 questions. Keep description under 6000 characters and custom topics under 2500.",
      },
      400,
    );
  }
  if (!process.env.GEMINI_API_KEY)
    return reply(
      {
        error:
          "Gemini is not configured. Add GEMINI_API_KEY to server secrets or author questions manually.",
      },
      503,
    );
  const now = Date.now();
  for (const [id, time] of requests)
    if (now - time >= 60000) requests.delete(id);
  if (requests.has(user.id))
    return reply(
      { error: "Wait one minute before generating another draft." },
      429,
    );
  requests.set(user.id, now);
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: assessmentSystemPrompt }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(input) }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 12000,
            temperature: 0.3,
          },
        }),
      },
    );
    if (!response.ok)
      return reply(
        {
          error:
            "Gemini is unavailable or quota was reached. No template questions were substituted. Try later or author manually.",
        },
        503,
      );
    const data = await response.json(),
      candidate = data.candidates?.[0];
    const raw = candidate?.content?.parts
      ?.filter((p: any) => typeof p.text === "string" && !p.thought)
      .map((p: any) => p.text)
      .join("")
      .trim();
    if (candidate?.finishReason !== "STOP" || !raw || raw.length > 100000)
      return reply(
        {
          error:
            "Gemini returned an incomplete draft. No questions were added.",
        },
        502,
      );
    try {
      return reply({
        questions: validateGeneratedQuestions(raw, input),
        source: "ai",
        promptVersion: ASSESSMENT_PROMPT_VERSION,
        requiresReview: true,
      });
    } catch {
      return reply(
        {
          error:
            "Generated draft failed validation. No answer keys or placeholder questions were invented. Try again or author manually.",
        },
        502,
      );
    }
  } catch {
    return reply(
      {
        error:
          "Generation could not finish. Existing draft is unchanged. Try later or author manually.",
      },
      503,
    );
  }
}
