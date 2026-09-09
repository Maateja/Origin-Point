"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  question: string;
  options: string[];
  explanation: string;
  skillArea?: string;
  skillKey: string;
  conceptKey: string;
  questionType: "conceptual" | "code" | "debugging" | "scenario" | "complexity";
}

interface SubmissionResult {
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  skillPerformance: Array<{ key: string; label: string; correctAnswers: number; totalQuestions: number; scorePercent: number }>;
  evaluatedQuestions: Array<Question & {
    chosenAnswer: number;
    chosenText: string;
    correctAnswer: number;
    correctText: string;
    isCorrect: boolean;
  }>;
}

// Map URL param IDs back to human-readable titles
const topicTitleMap: Record<string, string> = {
  dsa: "Programming & DSA",
  "web-dev": "Web Development",
  "db-sql": "Database & SQL",
  "system-design": "System Design",
  "ai-ml": "Artificial Intelligence & ML",
  "cloud-devops": "Cloud & DevOps",
  cybersecurity: "Cybersecurity",
  "os-systems": "Operating Systems",
};

const levelTitleMap: Record<string, string> = {
  "very-beginner": "Very Beginner",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function AssessmentTakePage() {
  const params = useParams();
  const router = useRouter();

  const topicId = typeof params?.topicId === "string" ? params.topicId : "dsa";
  const levelId = typeof params?.levelId === "string" ? params.levelId : "beginner";

  const topicTitle = topicTitleMap[topicId] ?? topicId;
  const levelTitle = levelTitleMap[levelId] ?? levelId;

  // Quiz state
  const [phase, setPhase] = useState<"loading" | "quiz" | "submitted">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [assessmentId, setAssessmentId] = useState("");
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Fetch questions on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/assessment-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, levelId }),
        });
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        if (data.assessmentId && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setAssessmentId(data.assessmentId);
          setQuestions(data.questions);
          setPhase("quiz");
        } else {
          throw new Error("Empty questions");
        }
      } catch (err) {
        console.error("Failed to load assessment questions:", err);
        setLoadError(true);
        setPhase("quiz");
      }
    })();
  }, [topicId, levelId]);

  const handleSelectOption = (questionId: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optIdx }));
  };

  const handleSubmit = async () => {
    if (questions.length === 0 || !assessmentId || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          levelId,
          assessmentId,
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedAnswer: selectedAnswers[question.id] ?? null,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit assessment.");
      setSubmissionResult(result);

      const reportId = `${topicId}-${levelId}`;
      const report = {
        id: reportId,
        topicId,
        levelId,
        topicTitle,
        levelTitle,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        scorePercent: result.scorePercent,
        correctCount: result.correctAnswers,
        totalCount: result.totalQuestions,
        evaluatedQuestions: result.evaluatedQuestions,
        skillBreakdown: result.skillPerformance.map((skill: SubmissionResult["skillPerformance"][number]) => ({
          skill: skill.label,
          score: skill.scorePercent,
          benchmark: 70,
          trend: (skill.scorePercent >= 70 ? "up" : "down") as "up" | "down",
        })),
        gapRecommendations: [],
      };

    try {
      localStorage.setItem("skillsync_latest_assessment_report", JSON.stringify(report));

      // Also persist to all completed assessment reports collection
      const existingReportsRaw = localStorage.getItem("skillsync_all_assessment_reports");
      let allReports: any[] = [];
      try {
        if (existingReportsRaw) {
          const parsed = JSON.parse(existingReportsRaw);
          if (Array.isArray(parsed)) allReports = parsed;
        }
      } catch {}
      const filtered = allReports.filter(
        (r: any) => !(r.topicTitle === topicTitle && r.levelTitle === levelTitle)
      );
      localStorage.setItem(
        "skillsync_all_assessment_reports",
        JSON.stringify([report, ...filtered])
      );
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }

      setPhase("submitted");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── LOADING ──────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <DashboardShell role="student" title="Assessment">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5">
          <div className="p-4 rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-foreground">
              Preparing Your Assessment
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Generating 10 level-calibrated questions for{" "}
              <span className="font-semibold text-foreground">{topicTitle}</span> ·{" "}
              <span className="font-semibold text-foreground">{levelTitle}</span>
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // ─── ERROR ────────────────────────────────────────────────────────────────────
  if (loadError || questions.length === 0) {
    return (
      <DashboardShell role="student" title="Assessment">
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground text-sm">Could not load questions. Please try again.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </DashboardShell>
    );
  }

  // ─── SUBMITTED RESULT ─────────────────────────────────────────────────────────
  if (phase === "submitted") {
    const result = submissionResult!;

    return (
      <DashboardShell role="student" title="Assessment Complete">
        <div className="max-w-2xl mx-auto pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Score card */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-10 text-center shadow-xs space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-8 w-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  Assessment Completed!
                </h1>
                <p className="text-muted-foreground text-sm">
                  {topicTitle} · <span className="font-semibold">{levelTitle}</span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-12">
                <div className="text-center">
                  <span className="block font-display text-4xl font-extrabold text-foreground">
                    {result.scorePercent}%
                  </span>
                  <span className="text-xs text-muted-foreground">Overall Score</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <span className="block font-display text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {result.correctAnswers}/{result.totalQuestions}
                  </span>
                  <span className="text-xs text-muted-foreground">Correct</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/student/assessment">
                  <Button variant="outline" className="rounded-2xl h-11 text-sm px-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Assessments
                  </Button>
                </Link>
                <Link href="/student/report">
                  <Button className="rounded-2xl h-11 text-sm px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Full Skill Report
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick answer review */}
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-foreground">Quick Answer Review</h2>
              {result.evaluatedQuestions.map((q, idx) => {
                const isCorrect = q.isCorrect;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "p-5 rounded-3xl border shadow-xs space-y-3",
                      isCorrect
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground leading-snug flex-1">
                        <span className="text-muted-foreground font-normal">Q{idx + 1}. </span>
                        {q.question}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    {!isCorrect && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                          <span className="font-bold text-destructive block mb-0.5">Your Answer:</span>
                          {q.chosenText}
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                            Correct Answer:
                          </span>
                          {q.options[q.correctAnswer]}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 border border-border/60">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </DashboardShell>
    );
  }

  // ─── ACTIVE QUIZ ──────────────────────────────────────────────────────────────
  const q = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = ((currentIdx + 1) / totalQ) * 100;
  const selectedOption = selectedAnswers[q.id];
  const isLastQ = currentIdx === totalQ - 1;

  return (
    <DashboardShell role="student" title={`Assessment · ${levelTitle}`}>
      <div className="max-w-2xl mx-auto pb-16">
        <div className="space-y-6">
          {/* ── Breadcrumb back ── */}
          <Link
            href="/student/assessment"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Assessments
          </Link>

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[0.68rem] uppercase font-bold tracking-wider text-primary">
                  {topicTitle}
                </span>
                <Badge variant="outline" className="text-[0.65rem] rounded-full px-2.5 font-semibold">
                  {levelTitle}
                </Badge>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Question {currentIdx + 1} <span className="text-muted-foreground font-normal">of {totalQ}</span>
              </h1>
            </div>

            {/* Circular mini progress */}
            <div className="relative flex items-center justify-center w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3.5" className="text-muted/40" fill="transparent" />
                <circle
                  cx="24" cy="24" r="20"
                  stroke="currentColor" strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 - (progressPercent / 100) * 2 * Math.PI * 20}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-500"
                  fill="transparent"
                />
              </svg>
              <span className="absolute font-display text-xs font-extrabold text-foreground select-none">
                {currentIdx + 1}/{totalQ}
              </span>
            </div>
          </div>

          {/* ── Linear progress bar ── */}
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-primary h-full rounded-full"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* ── Question card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Question text */}
              <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-xs">
                {q.skillArea && (
                  <Badge variant="outline" className="mb-4 text-[0.65rem] rounded-full px-2.5 font-semibold">
                    {q.skillArea}
                  </Badge>
                )}
                <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
                  {q.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={cn(
                        "w-full text-left p-4 sm:p-5 rounded-2xl border text-sm font-medium transition-all flex items-center gap-4",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground shadow-xs"
                          : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 text-foreground/90"
                      )}
                    >
                      <span
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-all",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-snug flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Navigation footer ── */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => p - 1)}
              className="rounded-xl h-10 px-5 text-sm gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>

            <span className="text-xs text-muted-foreground font-medium">
              {answeredCount}/{totalQ} answered
            </span>

            {!isLastQ ? (
              <Button
                size="sm"
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="rounded-xl h-10 px-5 text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl h-10 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            )}
          </div>
          {submitError && <p className="text-xs text-destructive text-right">{submitError}</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
