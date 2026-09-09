"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
} as const;

export default function SkillReportPage() {
  const router = useRouter();
  const [completedReports, setCompletedReports] = useState<AssessmentReport[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadReports() {
      let reports: AssessmentReport[] = [];

      try {
        const allSavedRaw = localStorage.getItem("skillsync_all_assessment_reports");
        const latestSavedRaw = localStorage.getItem("skillsync_latest_assessment_report");

        if (allSavedRaw) {
          const parsed = JSON.parse(allSavedRaw);
          if (Array.isArray(parsed)) {
            reports = parsed;
          }
        }

        // If allSaved was empty or missing but latest exists, ensure it is included
        if (reports.length === 0 && latestSavedRaw) {
          const parsed = JSON.parse(latestSavedRaw);
          if (parsed && parsed.scorePercent !== undefined) {
            reports = [parsed];
          }
        }
      } catch (e) {
        console.warn("Failed to load completed assessment reports from localStorage:", e);
      }

      // Check Supabase student_profiles if no reports found in localStorage
      if (reports.length === 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: sp } = await supabase
              .from("student_profiles")
              .select("latest_assessment")
              .eq("id", user.id)
              .maybeSingle();

            if (sp?.latest_assessment && (sp.latest_assessment as any).scorePercent !== undefined) {
              const la = sp.latest_assessment as any;
              const remoteReport: AssessmentReport = {
                id: `${la.topicId || "quiz"}-${la.levelId || "test"}`,
                topicTitle: la.topicTitle || "Diagnostic Assessment",
                levelTitle: la.levelTitle || "Assessment",
                date: la.submittedAt
                  ? new Date(la.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Recent",
                scorePercent: la.scorePercent,
                correctCount: la.correctAnswers,
                totalCount: la.totalQuestions,
                evaluatedQuestions: la.evaluatedQuestions || [],
                skillBreakdown: (la.skillPerformance || []).map((sp: any) => ({
                  skill: sp.label || sp.key,
                  score: sp.scorePercent || 0,
                  benchmark: 70,
                  trend: (sp.scorePercent || 0) >= 70 ? "up" : "down",
                })),
                gapRecommendations: [],
              };
              reports = [remoteReport];
              try {
                localStorage.setItem("skillsync_all_assessment_reports", JSON.stringify(reports));
                localStorage.setItem("skillsync_latest_assessment_report", JSON.stringify(remoteReport));
              } catch {}
            }
          }
        } catch (dbErr) {
          console.warn("Could not fetch remote reports from student_profiles:", dbErr);
        }
      }

      setCompletedReports(reports);
      setIsLoaded(true);
    }

    loadReports();
  }, []);

  // Aggregate overall skill breakdown across all taken assessments
  const overallSkillsMap = new Map<string, { totalScore: number; count: number; benchmark: number }>();
  completedReports.forEach((r) => {
    r.skillBreakdown?.forEach((sb) => {
      const existing = overallSkillsMap.get(sb.skill);
      if (existing) {
        existing.totalScore += sb.score;
        existing.count += 1;
      } else {
        overallSkillsMap.set(sb.skill, {
          totalScore: sb.score,
          count: 1,
          benchmark: sb.benchmark || 70,
        });
      }
    });
  });

  const overallSkills: SkillScore[] = Array.from(overallSkillsMap.entries()).map(([skill, data]) => {
    const avg = Math.round(data.totalScore / data.count);
    return {
      skill,
      score: avg,
      benchmark: data.benchmark,
      trend: avg >= data.benchmark ? "up" : "down",
    };
  });

  // Aggregate unique gap recommendations across all taken assessments
  const overallGapsMap = new Map<string, GapRec>();
  completedReports.forEach((r) => {
    r.gapRecommendations?.forEach((g) => {
      if (!overallGapsMap.has(g.gap)) {
        overallGapsMap.set(g.gap, g);
      }
    });
  });
  const overallGaps = Array.from(overallGapsMap.values());

  return (
    <DashboardShell role="student" title="Skill Report">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-16">

        {/* 1. Overall Header: Clean, unboxed text directly on page */}
        <motion.div variants={item}>
          <div className="py-2 space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Your Skill Report
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
              Overall skill proficiency evaluated strictly from your completed assessment modules. Click on any completed assessment below to open its dedicated report and review your answers.
            </p>
          </div>
        </motion.div>

        {/* 2. Empty State if no assessments have been completed yet */}
        {isLoaded && completedReports.length === 0 && (
          <motion.div variants={item}>
            <div className="p-8 sm:p-12 rounded-3xl border border-border/80 bg-card text-center space-y-4 max-w-xl mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Award className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-foreground">
                  No Assessments Completed Yet
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your skill report is generated directly from your assessment attempts. Complete an assessment module to see your verified score, skill breakdown, and gap recommendations.
                </p>
              </div>
              <Link href="/student/assessment">
                <Button className="rounded-2xl text-xs h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 mt-2">
                  Go to Skill Assessment
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}



        {/* 4. "Completed" Section: ONLY contains assessments user has actually completed */}
        {completedReports.length > 0 && (
          <motion.div variants={item} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="font-display text-xl font-bold text-foreground">Completed</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Click any block to open its dedicated page and view question breakdown
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {completedReports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/student/report/${r.id}`)}
                  className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:border-primary/60 hover:bg-muted/30 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 shadow-xs group select-none"
                >
                  <div className="space-y-2">
                    <span className="text-[0.68rem] uppercase font-bold tracking-wider text-primary block">
                      {r.levelTitle}
                    </span>
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {r.topicTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Completed on {r.date}
                    </p>
                  </div>

                  {/* Right side: exact correct count like 8/10 or 1/10 */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Score: {r.scorePercent}%
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {r.correctCount}/{r.totalCount} Correct
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 5. Overall Skill Breakdown (Aggregated from completed assessments) */}
        {overallSkills.length > 0 && (
          <motion.div variants={item}>
            <Card className="rounded-3xl border-border/80 shadow-xs">
              <CardHeader className="p-6 sm:p-7 pb-2">
                <CardTitle className="text-lg font-bold">Overall Skill Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Your aggregated performance benchmark across all completed assessment topics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-7 pt-4 space-y-6">
                {overallSkills.map((s) => (
                  <div key={s.skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{s.skill}</span>
                        {s.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                        {s.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                        {s.trend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Benchmark: {s.benchmark}%</span>
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
                          s.score >= s.benchmark ? "bg-emerald-500" : "bg-primary"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 6. Overall Gap Recommendations */}
        {overallGaps.length > 0 && (
          <motion.div variants={item}>
            <Card className="rounded-3xl border-border/80 shadow-xs">
              <CardHeader className="p-6 sm:p-7 pb-2">
                <CardTitle className="text-lg font-bold">Overall Skill Gap Recommendations</CardTitle>
                <CardDescription className="text-xs">
                  Targeted improvement areas identified from your completed assessment modules
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-7 pt-4 space-y-3.5">
                {overallGaps.map((rec, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{rec.gap}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[0.62rem] rounded-full px-2 py-0 font-semibold",
                            rec.priority === "High"
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          )}
                        >
                          {rec.priority} Priority
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.resource}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

      </motion.div>
    </DashboardShell>
  );
}
