// Pure server scoring. Answers are indexes; clients never submit a score or an answer key.
import { skillKey, skillName } from "./skill-taxonomy.mjs";
export function scoreAssessment(
  attempt,
  answers,
  date = new Date().toISOString(),
) {
  const target = attempt.pass_threshold ?? 70;
  const evaluatedQuestions = attempt.questions.map((q) => {
    const chosen = answers[String(q.id)];
    if (
      chosen !== undefined &&
      (!Number.isInteger(chosen) || chosen < 0 || chosen >= q.options.length)
    )
      throw new Error("Invalid answer option");
    return {
      ...q,
      chosenAnswer: chosen ?? -1,
      chosenText: chosen === undefined ? "Not answered" : q.options[chosen],
      correctText: q.options[q.correctAnswer],
      isCorrect: chosen === q.correctAnswer,
    };
  });
  if (
    Object.keys(answers).some(
      (id) => !attempt.questions.some((q) => String(q.id) === id),
    )
  )
    throw new Error("Unknown question");
  const correctCount = evaluatedQuestions.filter((q) => q.isCorrect).length;
  const areas = new Map();
  for (const q of evaluatedQuestions) {
    const key = skillKey(q.skillArea);
    const group = areas.get(key) || {
      skill: skillName(q.skillArea),
      total: 0,
      correct: 0,
    };
    group.total++;
    if (q.isCorrect) group.correct++;
    areas.set(key, group);
  }
  const skillBreakdown = [...areas].map(([_key, g]) => ({
    skill: g.skill,
    score: Math.round((g.correct / g.total) * 100),
    benchmark: target,
    trend: Math.round((g.correct / g.total) * 100) >= target ? "up" : "down",
  }));
  return {
    id: attempt.id,
    industryAssessmentId: attempt.industry_assessment_id || null,
    assessmentKind: attempt.industry_assessment_id ? "industry" : "practice",
    source: attempt.source,
    targetPercent: target,
    topicId: attempt.topic_id,
    topicTitle: attempt.topic_title,
    levelId: attempt.level_id,
    levelTitle: attempt.level_title,
    date,
    scorePercent: Math.round((correctCount / evaluatedQuestions.length) * 100),
    correctCount,
    totalCount: evaluatedQuestions.length,
    evaluatedQuestions,
    skillBreakdown,
    gapRecommendations: skillBreakdown
      .filter((s) => s.score < target)
      .map((s) => ({
        gap: s.skill,
        resource:
          "Review " +
          s.skill +
          " and practise related exercises. Industry assessments allow one scored attempt per version.",
        priority: s.score < 40 ? "High" : "Medium",
      })),
  };
}
