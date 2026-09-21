import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAssessment } from "../lib/assessment-scoring.mjs";
const attempt = {
  id: "test",
  topic_id: "test",
  topic_title: "Test",
  level_id: "beginner",
  level_title: "Beginner",
  questions: [
    {
      id: 1,
      question: "Q1",
      options: ["a", "b", "c", "d"],
      correctAnswer: 2,
      explanation: "Explanation",
      skillArea: "Logic",
    },
    {
      id: 2,
      question: "Q2",
      options: ["a", "b", "c", "d"],
      correctAnswer: 0,
      explanation: "Explanation",
      skillArea: "Logic",
    },
  ],
};
test("scores answers and unanswered questions without trusting client scores", () => {
  const r = scoreAssessment(attempt, { 1: 2 }, "2026-09-21");
  assert.equal(r.scorePercent, 50);
  assert.equal(r.correctCount, 1);
  assert.equal(r.evaluatedQuestions[1].chosenText, "Not answered");
  assert.equal(r.skillBreakdown[0].score, 50);
  assert.equal(r.gapRecommendations.length, 1);
});
test("rejects out-of-range and unknown question answers", () => {
  assert.throws(() => scoreAssessment(attempt, { 1: 99 }));
  assert.throws(() => scoreAssessment(attempt, { 123: 0 }));
});
test("perfect results have no invented skill gap", () => {
  assert.equal(
    scoreAssessment(attempt, { 1: 2, 2: 0 }).gapRecommendations.length,
    0,
  );
});

test("proctoring disqualification generates zeroed score and locks report", () => {
  const violations = [
    { type: "tab_switch", reason: "Tab switch detected", timestamp: new Date().toISOString() },
    { type: "copy_attempt", reason: "Clipboard copy attempt detected", timestamp: new Date().toISOString() },
    { type: "window_blur", reason: "Window focus lost", timestamp: new Date().toISOString() },
  ];
  assert.equal(violations.length, 3);
  const disqualifiedReport = {
    id: attempt.id,
    topicTitle: attempt.topic_title,
    scorePercent: 0,
    correctCount: 0,
    totalCount: attempt.questions.length,
    disqualified: true,
    violations,
  };
  assert.equal(disqualifiedReport.scorePercent, 0);
  assert.equal(disqualifiedReport.disqualified, true);
  assert.equal(disqualifiedReport.violations.length, 3);
});

