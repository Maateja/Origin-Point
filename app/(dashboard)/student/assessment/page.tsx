"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookOpen, ClipboardCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeading,
  DataState,
  Tag,
  Metric,
} from "@/components/platform/primitives";
import { usePlatformData } from "@/lib/platform-store";
import { assessmentTopics, assessmentLevels } from "@/lib/assessment-catalog";
import { coursesCatalog } from "@/lib/courses-data";
export default function Page() {
  const state = usePlatformData();
  const data = state.data;
  const [tab, setTab] = useState("assessments");
  const progress =
    data?.progress.filter((p) => p.user_id === data.profile.id) ?? [];
  const complete = Object.values(coursesCatalog).filter((c) =>
    c.modules.every((m) =>
      m.subTopics.every((s) =>
        progress.some(
          (p) =>
            p.course_id === c.id &&
            p.module_id === m.id &&
            p.subtopic_id === s.id,
        ),
      ),
    ),
  ).length;
  return (
    <DashboardShell role="student" title="Learning & assessments">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Build your capabilities"
          title="A little progress, every day."
          description="Explore learning tracks and practice assessments. Your results and completed subtopics are saved to your account."
        />
        <DataState {...state} retry={state.refresh} />
        {data && !state.error && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Completed assessments"
                value={
                  data.reports.filter((r) => r.userId === data.profile.id)
                    .length
                }
              />
              <Metric label="Practised subtopics" value={progress.length} />
              <Metric label="Completed learning tracks" value={complete} />
            </div>
            <div className="flex w-fit gap-1 rounded-2xl border border-border bg-muted/50 p-1.5">
              {["assessments", "courses"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "rounded-xl px-5 py-2.5 text-sm font-semibold capitalize " +
                    (tab === t ? "bg-card shadow-sm" : "text-muted-foreground")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "assessments" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(assessmentTopics).map(([id, title]) => (
                  <Card key={id}>
                    <CardContent className="p-6">
                      <ClipboardCheck className="mb-4 h-6 w-6 role-text" />
                      <h2 className="font-display text-xl font-semibold">
                        {title}
                      </h2>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        10 AI-generated practice questions. Choose the level
                        that fits your experience.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {Object.entries(assessmentLevels).map(
                          ([level, label]) => (
                            <Link
                              key={level}
                              href={
                                "/student/assessment/take/" + id + "/" + level
                              }
                              className="rounded-xl border border-border p-2.5 text-center text-xs font-medium transition hover:bg-muted"
                            >
                              {label}
                            </Link>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.values(coursesCatalog).map((c) => {
                  const total = c.modules.reduce(
                    (sum, m) => sum + m.subTopics.length,
                    0,
                  );
                  const done = progress.filter(
                    (p) => p.course_id === c.id,
                  ).length;
                  return (
                    <Link
                      key={c.id}
                      href={"/student/assessment/course/" + c.id}
                    >
                      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                        <CardContent className="p-6">
                          <div className="flex justify-between">
                            <BookOpen className="h-6 w-6 role-text" />
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="mt-5 text-[10px] font-semibold uppercase tracking-widest role-text">
                            {c.category}
                          </p>
                          <h2 className="mt-2 font-display text-xl font-semibold">
                            {c.title}
                          </h2>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {c.description}
                          </p>
                          <p className="mt-5 text-xs text-muted-foreground">
                            {done} / {total} subtopics practised
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full role-gradient"
                              style={{
                                width:
                                  Math.min(100, (done / total) * 100) + "%",
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
