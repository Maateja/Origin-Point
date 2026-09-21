"use client";

import { useState } from "react";
import { usePlatformData } from "@/lib/platform-store";
import { DataState } from "@/components/platform/primitives";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";

interface EvaluatedQuestion {
  id: number;
  question: string;
  options: string[];
  chosenAnswer: number;
  chosenText: string;
  correctAnswer: number;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
  skillArea: string;
}

interface SkillScore {
  skill: string;
  score: number;
  benchmark: number;
  trend: "up" | "down" | "neutral";
}

interface GapRec {
  gap: string;
  resource: string;
  priority: string;
}

interface AssessmentReport {
  id: string;
  topicTitle: string;
  levelTitle: string;
  date: string;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  evaluatedQuestions: EvaluatedQuestion[];
  skillBreakdown: SkillScore[];
  gapRecommendations: GapRec[];
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = typeof params?.reportId === "string" ? params.reportId : "";

  const state = usePlatformData();
  const report =
    state.data?.reports.find(
      (r) => r.id === reportId && r.userId === state.data?.profile.id,
    ) ?? null;
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect">("all");
  const isLoaded = !!state.data;
  if (state.loading || state.error)
    return (
      <DashboardShell role="student" title="Skill Report">
        <DataState {...state} retry={state.refresh} />
      </DashboardShell>
    );

  if (isLoaded && !report) {
    return (
      <DashboardShell role="student" title="Report Not Found">
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground text-sm">
            Assessment report not found. Complete an assessment to generate your
            report.
          </p>
          <Link href="/student/report">
            <Button variant="outline" className="rounded-2xl text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Skill Report
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (!report) {
    return (
      <DashboardShell role="student" title="Loading Report">
        <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
          Loading assessment details...
        </div>
      </DashboardShell>
    );
  }

  const evaluatedQuestions = report.evaluatedQuestions || [];
  const filteredQuestions = evaluatedQuestions.filter((q) => {
    if (filter === "correct") return q.isCorrect;
    if (filter === "incorrect") return !q.isCorrect;
    return true;
  });

  const activeSkills = report.skillBreakdown || [];
  const activeGaps = report.gapRecommendations || [];

  return (
    <DashboardShell role="student" title={`${report.topicTitle} Report`}>
      <div className="mb-5 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-semibold">
          {report.assessmentKind === "industry"
            ? "Industry-authored assessment"
            : "AI-generated practice assessment"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {report.source || "Practice assessment"} · Target:{" "}
          {report.targetPercent ?? 70}% · Not an accredited certification
        </p>
      </div>
      <div className="space-y-8 max-w-5xl mx-auto pb-16">
        {/* Back navigation */}
        <div>
          <Link
            href="/student/report"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overall Skill Report
          </Link>
        </div>

        {/* 1. Only That Block (Clean, unboxed card showing this completed assessment) */}
        <div className="p-6 sm:p-8 rounded-3xl border border-primary/30 bg-primary/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-primary">
              {report.levelTitle}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {report.topicTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Completed on {new Date(report.date).toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="flex items-center gap-4 self-start sm:self-center">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">
                Score: {report.scorePercent}%
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {report.correctCount}/{report.totalCount} Correct
              </span>
            </div>
          </div>
        </div>

        {/* 2. Detailed Question Review: check which options are correct and which are wrong */}
        {evaluatedQuestions.length > 0 && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Question Review: {report.topicTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Check which options are correct and which are wrong
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/70 w-fit">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    filter === "all"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({evaluatedQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("correct")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    filter === "correct"
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Correct ({report.correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("incorrect")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    filter === "incorrect"
                      ? "bg-background text-destructive shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Wrong ({report.totalCount - report.correctCount})
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className={cn(
                    "p-5 sm:p-6 rounded-3xl border bg-card transition-all duration-200 shadow-xs space-y-4",
                    q.isCorrect
                      ? "border-emerald-500/30 hover:border-emerald-500/50"
                      : "border-destructive/30 hover:border-destructive/50",
                  )}
                >
                  {/* Top: Status & Skill Area */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Question {q.id}
                      </span>
                      {q.skillArea && (
                        <Badge
                          variant="outline"
                          className="text-[0.65rem] rounded-full px-2.5"
                        >
                          {q.skillArea}
                        </Badge>
                      )}
                    </div>

                    <div>
                      {q.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1 rounded-full">
                          <XCircle className="h-3.5 w-3.5" /> Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                    {q.question}
                  </p>

                  {/* All Options Inspection (which are correct and which are wrong) */}
                  {q.options && q.options.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider block">
                        Options Breakdown:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isUserChoice = q.chosenAnswer === optIdx;
                          const isCorrectOpt = q.correctAnswer === optIdx;

                          let badgeStyle =
                            "border-border/70 bg-muted/20 text-muted-foreground";
                          let label = "";

                          if (isCorrectOpt) {
                            badgeStyle =
                              "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold";
                            label = isUserChoice
                              ? "Your Answer (Correct)"
                              : "Correct Answer";
                          } else if (isUserChoice) {
                            badgeStyle =
                              "border-destructive/40 bg-destructive/10 text-destructive font-semibold";
                            label = "Your Answer (Wrong)";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={cn(
                                "p-3 rounded-2xl border text-xs flex items-center justify-between gap-2",
                                badgeStyle,
                              )}
                            >
                              <span className="leading-snug">{opt}</span>
                              {label && (
                                <span className="text-[0.65rem] uppercase font-bold flex-shrink-0">
                                  {label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Concept Explanation Box */}
                  {q.explanation && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 text-xs space-y-1">
                      <span className="font-bold text-foreground text-[0.7rem] uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        Concept Explanation
                      </span>
                      <p className="text-muted-foreground leading-relaxed pt-0.5">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Skill Breakdown for this assessment */}
        {activeSkills.length > 0 && (
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="p-6 sm:p-7 pb-2">
              <CardTitle className="text-lg font-bold">
                Skill Breakdown &bull; {report.topicTitle}
              </CardTitle>
              <CardDescription className="text-xs">
                Competency performance against this assessment’s target in{" "}
                {report.topicTitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 pt-4 space-y-6">
              {activeSkills.map((s) => (
                <div key={s.skill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {s.skill}
                      </span>
                      {s.trend === "up" && (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {s.trend === "down" && (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                      {s.trend === "neutral" && (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Assessment target: {s.benchmark}%</span>
                      <span className="font-display font-extrabold text-foreground text-sm">
                        {s.score}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 h-full w-0.5 bg-foreground/40 z-10"
                      style={{ left: `${s.benchmark}%` }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.score}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "h-full rounded-full",
                        s.score >= s.benchmark
                          ? "bg-emerald-500"
                          : "bg-primary",
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 4. Skill Gap Recommendations for this assessment */}
        {activeGaps.length > 0 && (
          <Card className="rounded-3xl border-border/80 shadow-xs">
            <CardHeader className="p-6 sm:p-7 pb-2">
              <CardTitle className="text-lg font-bold">
                Skill Gap Recommendations &bull; {report.topicTitle}
              </CardTitle>
              <CardDescription className="text-xs">
                Targeted recommendations based on incorrect answers in this
                assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 pt-4 space-y-3.5">
              {activeGaps.map((rec, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {rec.gap}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[0.62rem] rounded-full px-2 py-0 font-semibold",
                          rec.priority === "High"
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                        )}
                      >
                        {rec.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rec.resource}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
