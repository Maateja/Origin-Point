"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { refreshPlatform, type AssessmentReport } from "@/lib/platform-store";
import { Tag, useAction } from "./primitives";
import {
  SafeExamInstructionsDialog,
  SafeExamStatusBar,
  SafeExamWarningModal,
  SafeExamDisqualifiedCard,
  useSafeExamProctor,
  type ProctorViolation,
} from "./safe-exam-proctor";

interface Question {
  id: number;
  question: string;
  options: string[];
  skillArea: string;
}

export function AssessmentRunner({
  request,
  courseMode = false,
  industryMode = false,
}: {
  request: Record<string, string>;
  courseMode?: boolean;
  industryMode?: boolean;
}) {
  const [attempt, setAttempt] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualifiedViolations, setDisqualifiedViolations] = useState<ProctorViolation[]>([]);
  const action = useAction();

  const handleDisqualify = async (violations: ProctorViolation[]) => {
    setIsDisqualified(true);
    setDisqualifiedViolations(violations);
    try {
      const r = await fetch("/api/assessments/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt, violations }),
      });
      const d = await r.json();
      if (d.report) {
        setReport(d.report);
      }
      await refreshPlatform();
    } catch {
      setReport({
        id: attempt,
        topicId: request.topicId || "assessment",
        topicTitle: "Assessment",
        levelId: "proctored",
        levelTitle: "Proctored Exam",
        date: new Date().toISOString(),
        scorePercent: 0,
        correctCount: 0,
        totalCount: questions.length || 10,
        disqualified: true,
        disqualificationReason: "Assessment terminated due to repeated proctoring violations.",
        violations,
        evaluatedQuestions: [],
        skillBreakdown: [],
        gapRecommendations: [],
      });
    }
  };

  const proctor = useSafeExamProctor({
    isActive: questions.length > 0 && !report && !isDisqualified,
    attemptId: attempt,
    onDisqualify: handleDisqualify,
    maxStrikes: 3,
  });

  async function start() {
    await action.run(async () => {
      const r = await fetch(
        industryMode
          ? "/api/industry-assessments/start"
          : courseMode
            ? "/api/course-questions"
            : "/api/assessment-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAttempt(d.attemptId);
      if (d.report) {
        setReport(d.report);
        if (d.report.disqualified) {
          setIsDisqualified(true);
        }
      } else {
        setQuestions(d.questions);
      }
    }, "Assessment ready.");
  }

  const handleAcceptAndStart = async () => {
    setShowInstructions(false);
    await proctor.requestFullscreen();
    await start();
  };

  async function submit() {
    await action.run(async () => {
      const r = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt, answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setReport(d.report);
      await refreshPlatform();
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }, "Results saved to your account.");
  }

  const q = questions[index];

  return (
    <div className="space-y-5">
      {action.feedback}

      {/* Pre-Exam Safe Exam Instructions Modal */}
      <SafeExamInstructionsDialog
        isOpen={showInstructions}
        onAcceptAndStart={handleAcceptAndStart}
        onCancel={() => setShowInstructions(false)}
        industryMode={industryMode}
      />

      {/* Warning Modal on Strike 1 and 2 */}
      <SafeExamWarningModal
        isOpen={!!proctor.activeWarning}
        strike={proctor.strikes}
        maxStrikes={3}
        violation={proctor.activeWarning}
        onAcknowledge={proctor.acknowledgeWarning}
      />

      {/* If Report is Disqualified, Show Disqualified Card */}
      {report?.disqualified ? (
        <SafeExamDisqualifiedCard
          violations={report.violations || disqualifiedViolations}
          onReturn={() => {
            if (typeof window !== "undefined") {
              window.location.href = industryMode
                ? "/student/industry-assessments"
                : "/student/assessment";
            }
          }}
        />
      ) : report ? (
        <>
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h2 className="mt-4 font-display text-2xl font-bold">
                Assessment complete
              </h2>
              <p className="mt-4 text-5xl font-bold role-text">
                {report.scorePercent}%
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {report.correctCount} of {report.totalCount} questions correct
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {industryMode
                  ? "Industry-authored assessment · employer-defined target: " +
                    (report.targetPercent ?? 70) +
                    "% · not an accredited certification"
                  : "Practice performance · not an independent certification"}
              </p>
              <Link
                href={
                  courseMode
                    ? "/student/assessment/course/" + request.courseId
                    : "/student/report/" + report.id
                }
              >
                <Button className="mt-6 role-gradient border-0 text-white">
                  {courseMode ? "Return to course" : "View full report"}
                </Button>
              </Link>
            </CardContent>
          </Card>
          {report.evaluatedQuestions.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <Tag positive={q.isCorrect}>
                  {q.isCorrect ? "Correct" : "Review"}
                </Tag>
                <p className="mt-3 text-sm font-semibold">{q.question}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your answer: {q.chosenText}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Correct answer: {q.correctText}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {q.explanation}
                </p>
              </CardContent>
            </Card>
          ))}
        </>
      ) : q ? (
        <div className="space-y-4">
          {/* Active Safe Exam Proctored Status Header */}
          <SafeExamStatusBar
            strikes={proctor.strikes}
            maxStrikes={3}
            isFullscreen={proctor.isFullscreen}
            onRequestFullscreen={proctor.requestFullscreen}
          />

          <Card className="select-none">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <Tag>{q.skillArea}</Tag>
                <span className="text-xs text-muted-foreground">
                  Question {index + 1} / {questions.length}
                </span>
              </div>
              <div className="my-5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full role-gradient"
                  style={{
                    width:
                      (Object.keys(answers).length / questions.length) * 100 +
                      "%",
                  }}
                />
              </div>
              <h2 className="text-lg font-semibold leading-8">{q.question}</h2>
              <div
                className="mt-6 space-y-3"
                role="radiogroup"
                aria-label="Answer options"
              >
                {q.options.map((option, i) => {
                  const questionId = String(q.id ?? index + 1);
                  const isSelected = answers[questionId] === i;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      key={i}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [questionId]: i }))
                      }
                      className={
                        "group relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl p-4 text-left text-sm transition-all select-none " +
                        (isSelected
                          ? "border-2 border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25"
                          : "border border-border/80 bg-card/60 hover:border-primary/50 hover:bg-muted/40")
                      }
                    >
                      {/* Radio Circle Indicator */}
                      <div
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all " +
                          (isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-muted-foreground/40 bg-background group-hover:border-primary/60")
                        }
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Letter Badge (A, B, C, D) */}
                      <span
                        className={
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all " +
                          (isSelected
                            ? "bg-primary text-white shadow-xs"
                            : "border border-border bg-muted text-muted-foreground group-hover:text-foreground")
                        }
                      >
                        {String.fromCharCode(65 + i)}
                      </span>

                      {/* Option Text */}
                      <span
                        className={
                          "flex-1 leading-relaxed " +
                          (isSelected
                            ? "font-medium text-foreground"
                            : "text-muted-foreground group-hover:text-foreground")
                        }
                      >
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-7 flex flex-wrap justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={!index || action.busy}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {index < questions.length - 1 ? (
                  <Button onClick={() => setIndex((i) => i + 1)}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    disabled={
                      action.busy ||
                      Object.keys(answers).length !== questions.length
                    }
                    onClick={submit}
                    className="role-gradient border-0 text-white"
                  >
                    {action.busy ? "Saving results…" : "Submit assessment"}
                  </Button>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {Object.keys(answers).length} answered. Answer every question
                before submitting.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-display text-xl font-semibold">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {industryMode
                ? "Start or resume the employer’s published assessment. Only submitted answers are saved. You can submit once per published version."
                : "Start a 10-question practice assessment. Your submitted answers are scored and saved to your account."}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Proctored Safe Exam Environment Enabled
            </div>
            <div>
              <Button
                onClick={() => setShowInstructions(true)}
                disabled={action.busy}
                className="mt-6 role-gradient border-0 text-white"
              >
                {action.busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing assessment…
                  </>
                ) : (
                  "Start assessment"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
