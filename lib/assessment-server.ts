import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coursesCatalog } from "@/lib/courses-data";
import { assessmentTopics, assessmentLevels } from "@/lib/assessment-catalog";

const questionSchema = z
  .array(
    z.object({
      question: z.string().min(10).max(2000),
      options: z.array(z.string().min(1).max(800)).length(4),
      correctAnswer: z.number().int().min(0).max(3),
      explanation: z.string().min(5).max(3000),
      skillArea: z.string().min(2).max(100),
    }),
  )
  .length(10);
export async function startAssessment(request: Request, courseMode = false) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to take an assessment." },
      { status: 401 },
    );
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student")
    return NextResponse.json(
      { error: "Assessments are available to student accounts." },
      { status: 403 },
    );
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid assessment request." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error:'Invalid assessment request.'},{status:400});
  let topicId = body.topicId;
  let topicTitle = Object.hasOwn(assessmentTopics,topicId) ? assessmentTopics[topicId] : undefined;
  let levelId = body.levelId;
  let levelTitle = Object.hasOwn(assessmentLevels,levelId) ? assessmentLevels[levelId] : undefined;
  let context = "";
  let courseId: null | string = null;
  let moduleId: null | string = null;
  let subtopicId: null | string = null;
  if (courseMode) {
    const course = Object.hasOwn(coursesCatalog,body.courseId) ? coursesCatalog[body.courseId] : undefined;
    const courseModule = course?.modules.find((m) => m.id === body.moduleId);
    const subtopic = courseModule?.subTopics.find(
      (s) => s.id === body.subtopicId,
    );
    if (!course || !courseModule || !subtopic)
      return NextResponse.json(
        { error: "Course topic not found." },
        { status: 400 },
      );
    courseId = course.id;
    moduleId = courseModule.id;
    subtopicId = subtopic.id;
    topicId = subtopic.id;
    topicTitle = subtopic.title;
    levelId = courseModule.level;
    levelTitle = courseModule.levelName;
    context = course.title + " / " + courseModule.title;
  }
  if (!topicTitle || !levelTitle)
    return NextResponse.json(
      { error: "Choose a valid topic and difficulty." },
      { status: 400 },
    );
  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json(
      {
        error:
          "Assessment generation is not configured. Contact the project administrator.",
      },
      { status: 503 },
    );
  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("assessment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (countError)
    return NextResponse.json(
      {
        error:
          "Assessment storage is not ready. Contact the project administrator.",
      },
      { status: 503 },
    );
  if ((count ?? 0) >= 10)
    return NextResponse.json(
      {
        error:
          "You have started 10 assessments this hour. Please return later.",
      },
      { status: 429 },
    );
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
        signal: AbortSignal.timeout(55000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Create exactly 10 distinct multiple-choice questions about " +
                    topicTitle +
                    " at " +
                    levelTitle +
                    " difficulty. Context: " +
                    context +
                    ". These are practice assessments, not certifications. Calibrate to this specific topic and difficulty, avoid ambiguous answers. Each question must have four distinct options, one correctAnswer index 0..3, a clear explanation, and a specific skillArea. Vary the position of the correct answer. Return a JSON array with keys question, options, correctAnswer, explanation, skillArea.",
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            "The assessment provider is unavailable. Please try again later.",
        },
        { status: 502 },
      );
    const result = await response.json();
    const text =
      result.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("") || "";
    const questions = questionSchema
      .parse(JSON.parse(text))
      .map((q, i) => ({ ...q, id: i + 1 }));
    if (
      new Set(questions.map((q) => q.question)).size !== 10 ||
      questions.some((q) => new Set(q.options).size !== 4)
    )
      throw new Error("Duplicate questions or options");
    const { data: attempt, error } = await admin
      .from("assessment_attempts")
      .insert({
        user_id: user.id,
        topic_id: topicId,
        topic_title: topicTitle,
        level_id: levelId,
        level_title: levelTitle,
        questions,
        source: "Gemini / " + model,
        course_id: courseId,
        module_id: moduleId,
        subtopic_id: subtopicId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json(
      {
        attemptId: attempt.id,
        topicTitle,
        levelTitle,
        source: "AI-generated practice",
        questions: questions.map(({ correctAnswer, explanation, ...q }) => q),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not prepare a valid assessment. No result has been recorded. Please try again.",
      },
      { status: 502 },
    );
  }
}
