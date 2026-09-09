import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DIAGNOSTIC_LEVELS,
  diagnosticTaxonomy,
  getDiagnosticConcept,
  getDiagnosticSkill,
  getDiagnosticTopic,
  type DiagnosticLevelId,
  type DiagnosticTopicId,
} from "@/lib/diagnostic-taxonomy";
import { getDiagnosticBlueprint } from "@/lib/diagnostic-blueprints";
import { getDiagnosticAssessmentSnapshot } from "@/lib/diagnostic-assessment-sessions";

const topicIds = new Set(diagnosticTaxonomy.map((topic) => topic.id));
const levelIds = new Set(DIAGNOSTIC_LEVELS.map((level) => level.id));

const submissionSchema = z.object({
  topicId: z.string().trim().min(1),
  levelId: z.string().trim().min(1),
  assessmentId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedAnswer: z.number().int().nullable(),
  }).strict()).length(10),
}).strict();

async function getAuthenticatedStudent() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { status: 401 as const };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "student") return { status: 403 as const };
  return { status: 200 as const, user };
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedStudent();
    if (auth.status === 401) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (auth.status === 403) return NextResponse.json({ error: "Only students may take diagnostic assessments." }, { status: 403 });

    const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return invalid("Invalid assessment submission.");

    const { topicId, levelId, assessmentId, answers } = parsed.data;
    if (!topicIds.has(topicId) || !levelIds.has(levelId as DiagnosticLevelId)) return invalid("Invalid diagnostic topic or level.");

    const resolvedTopicId = topicId as DiagnosticTopicId;
    const resolvedLevelId = levelId as DiagnosticLevelId;
    const blueprint = getDiagnosticBlueprint(resolvedTopicId, resolvedLevelId);
    getDiagnosticTopic(resolvedTopicId);

    const snapshot = getDiagnosticAssessmentSnapshot(assessmentId);
    if (!snapshot || snapshot.userId !== auth.user.id) return invalid("Assessment session is missing or has expired.");
    if (snapshot.topicId !== topicId || snapshot.levelId !== levelId || snapshot.blueprintId !== blueprint.blueprintId) {
      return invalid("Assessment does not match the selected diagnostic blueprint.");
    }
    if (snapshot.questions.length !== blueprint.totalQuestions) return invalid("Assessment question count is invalid.");

    const expectedSlots = blueprint.allocations.flatMap((allocation) =>
      Array.from({ length: allocation.questionCount }, () => allocation),
    );
    const snapshotIds = new Set(snapshot.questions.map((question) => question.id));
    if (snapshotIds.size !== blueprint.totalQuestions || snapshot.questions.some((question, index) => {
      const slot = expectedSlots[index];
      return question.id !== index + 1 || question.skillKey !== slot.skillKey || question.conceptKey !== slot.conceptKey || question.questionType !== slot.questionType;
    })) return invalid("Assessment questions do not match the selected diagnostic blueprint.");

    const answerIds = answers.map((answer) => answer.questionId);
    if (new Set(answerIds).size !== answerIds.length) return invalid("Duplicate question IDs are not allowed.");
    if (answerIds.some((id) => !snapshotIds.has(id))) return invalid("Unknown question ID.");
    if (answerIds.length !== snapshot.questions.length || snapshot.questions.some((question) => !answerIds.includes(question.id))) {
      return invalid("Answers must include every assessment question exactly once.");
    }

    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.selectedAnswer]));
    for (const question of snapshot.questions) {
      const selectedAnswer = answersByQuestionId.get(question.id);
      if (selectedAnswer !== null && (selectedAnswer === undefined || selectedAnswer < 0 || selectedAnswer >= question.options.length)) {
        return invalid("Answer index is outside the valid option range.");
      }
    }

    let correctAnswers = 0;
    const conceptStats = new Map<string, { correct: number; total: number }>();
    const skillStats = new Map<string, { correct: number; total: number }>();
    const evaluatedQuestions = snapshot.questions.map((question) => {
      const selectedAnswer = answersByQuestionId.get(question.id) ?? null;
      const isCorrect = selectedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers += 1;
      for (const [key, stats] of [[question.conceptKey, conceptStats], [question.skillKey, skillStats]] as const) {
        const current = stats.get(key) ?? { correct: 0, total: 0 };
        current.total += 1;
        if (isCorrect) current.correct += 1;
        stats.set(key, current);
      }
      return {
        id: question.id,
        question: question.question,
        options: question.options,
        chosenAnswer: selectedAnswer ?? -1,
        chosenText: selectedAnswer === null ? "Not answered" : question.options[selectedAnswer],
        correctAnswer: question.correctAnswer,
        correctText: question.options[question.correctAnswer],
        isCorrect,
        explanation: question.explanation,
        skillKey: question.skillKey,
        conceptKey: question.conceptKey,
        questionType: question.questionType,
        skillArea: question.skillArea,
      };
    });
    const totalQuestions = snapshot.questions.length;
    const toPerformance = (stats: Map<string, { correct: number; total: number }>, label: (key: string) => string | undefined) =>
      Array.from(stats.entries()).map(([key, value]) => ({ key, label: label(key) ?? key, correctAnswers: value.correct, totalQuestions: value.total, scorePercent: Math.round((value.correct / value.total) * 100) }));

    const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);
    const conceptPerformance = toPerformance(conceptStats, (key) => getDiagnosticConcept(key)?.label);
    const skillPerformance = toPerformance(skillStats, (key) => getDiagnosticSkill(key)?.label);
    const topicTitle = getDiagnosticTopic(resolvedTopicId).title;
    const levelTitle = DIAGNOSTIC_LEVELS.find((level) => level.id === resolvedLevelId)?.title || levelId;

    const assessmentResult = {
      topicId,
      levelId,
      topicTitle,
      levelTitle,
      totalQuestions,
      correctAnswers,
      scorePercent,
      conceptPerformance,
      skillPerformance,
      evaluatedQuestions,
      submittedAt: new Date().toISOString(),
    };

    // Persist assessment result & aggregate score to student_profiles
    try {
      const supabase = await createClient();
      const { data: currentStudent } = await supabase
        .from("student_profiles")
        .select("assessment_scores")
        .eq("id", auth.user.id)
        .maybeSingle();

      const existingScores = (currentStudent?.assessment_scores as Record<string, any>) || {};
      const updatedScores = {
        ...existingScores,
        [topicId]: {
          scorePercent,
          correctAnswers,
          totalQuestions,
          levelId,
          topicTitle,
          date: new Date().toISOString(),
        },
      };

      const scoreValues = Object.values(updatedScores)
        .map((entry: any) => entry.scorePercent)
        .filter((s) => typeof s === "number");

      const overallSkillScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : scorePercent;

      await supabase
        .from("student_profiles")
        .update({
          latest_assessment: assessmentResult,
          assessment_scores: updatedScores,
          overall_skill_score: overallSkillScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id);
    } catch (saveError) {
      console.warn("Could not persist assessment to student_profiles:", saveError);
    }

    return NextResponse.json(assessmentResult);
  } catch (error) {
    console.error("Assessment submission endpoint error:", error);
    return NextResponse.json({ error: "Unable to score assessment." }, { status: 500 });
  }
}
