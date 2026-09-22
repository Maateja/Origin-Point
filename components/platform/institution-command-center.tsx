"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, ArrowUpRight, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData, exportRecords } from "@/lib/platform-store";
import { useApplicationTracking } from "@/lib/application-tracking";
import { useRecruitment } from "@/lib/recruitment";
import { useLearningPrograms } from "@/lib/learning-programs";
import { buildInstitutionAnalytics } from "@/lib/institution-analytics.mjs";
import { DataState, Empty, Field, PageHeading, Tag } from "./primitives";
type Drill = {
  id: string;
  label: string;
  definition: string;
  rows: Array<{
    id: string;
    name: string;
    title: string;
    detail: string;
    sourceId: string;
    href: string;
  }>;
};
export function InstitutionCommandCenter() {
  const platform = usePlatformData();
  const tracking = useApplicationTracking();
  const recruitment = useRecruitment();
  const learning = useLearningPrograms();
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [selection, setSelection] = useState("members");
  const [refreshing, setRefreshing] = useState(false);
  const sources = [
    { name: "Institution and cohort", state: platform },
    { name: "Internship tracking", state: tracking },
    { name: "Recruitment", state: recruitment },
    { name: "Learning programs", state: learning },
  ];
  const ready = sources.every((s) => s.state.data && !s.state.error);
  const model = ready
    ? buildInstitutionAnalytics({
        platform: platform.data,
        tracking: tracking.data,
        recruitment: recruitment.data,
        learning: learning.data,
        filters: { role, department, year },
      })
    : null;
  const drills: Drill[] = model
    ? [
        ...model.metrics,
        ...model.funnel,
        ...model.queues,
        ...model.skills.flatMap((s) => [
          {
            id: "skill:" + s.id,
            label: s.label + " · below target",
            definition:
              "Latest saved assessment per member and canonical skill; target belongs to the assessment issuer.",
            rows: s.rows,
          },
          {
            id: "assessed:" + s.id,
            label: s.label + " · assessed members",
            definition:
              "Latest saved assessment for each member in this skill.",
            rows: s.assessedRows,
          },
          {
            id: "unassessed:" + s.id,
            label: s.label + " · not assessed",
            definition:
              "Cohort members without saved industry assessment evidence for this skill. This is unknown proficiency, not a measured weakness.",
            rows: s.unassessedRows,
          },
        ]),
      ]
    : [];
  const drill = drills.find((d) => d.id === selection) ?? drills[0];
  const choose = (id: string) => {
    setSelection(id);
    document.getElementById("command-center-records")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };
  return (
    <DashboardShell role="institution" title="Institution command center">
      <div className="space-y-7">
        <PageHeading
          eyebrow="Connected institution intelligence"
          title="See the journey. Know the next step."
          description="A current snapshot of approved members—from assessed skill gaps to learning, internships and confirmed joining. Every metric opens the actual records behind it."
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await Promise.allSettled(
                      sources.map((s) => s.state.refresh()),
                    );
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing…" : "Refresh data"}
              </Button>
              <Button
                variant="outline"
                disabled={!model}
                onClick={() => {
                  if (model)
                    exportRecords("institution-command-center.json", model);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export filtered snapshot
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <Tag key={s.name} positive={!!s.state.data && !s.state.error}>
              {s.name}:{" "}
              {s.state.error
                ? "Unavailable"
                : s.state.data
                  ? "Loaded"
                  : "Loading"}
            </Tag>
          ))}
        </div>
        {!ready && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Metrics stay hidden until every source is available. A failed
              request is not treated as zero activity.
            </p>
            {sources
              .filter((s) => s.state.error || !s.state.data)
              .map((s) => (
                <div key={s.name}>
                  <h2 className="mb-2 text-sm font-semibold">{s.name}</h2>
                  <DataState {...s.state} retry={s.state.refresh} />
                </div>
              ))}
          </div>
        )}
        {model && (
          <>
            <div className="glass-panel grid gap-4 rounded-3xl p-5 md:grid-cols-3">
              <Field label="Member role">
                <select
                  className="field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="student">Students</option>
                  <option value="academician">Academicians</option>
                  <option value="all">Students and academicians</option>
                </select>
              </Field>
              <Field label="Department">
                <select
                  className="field"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">All departments</option>
                  {model.options.departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Graduation cohort">
                <select
                  className="field"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="">All graduation years</option>
                  {model.options.years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </div>
            {!!model.missingProfiles && (
              <p
                role="status"
                className="rounded-2xl border border-amber-500/30 p-4 text-sm"
              >
                {model.missingProfiles} approved memberships have no available
                directory profile and cannot be classified into a cohort. They
                are excluded; refresh or check their profiles.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {model.metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => choose(m.id)}
                  className="glass-panel rounded-3xl p-5 text-left transition-transform hover:scale-[1.02] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {m.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 role-text" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight">
                    {m.value}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {m.definition}
                  </p>
                </button>
              ))}
              <button
                onClick={() => choose("placement-members")}
                className="glass-panel rounded-3xl p-5 text-left transition-transform hover:scale-[1.02] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <p className="text-sm text-muted-foreground">
                  Confirmed joining rate
                </p>
                <p className="mt-4 text-3xl font-semibold">
                  {model.placementRate === null
                    ? "—"
                    : model.placementRate + "%"}
                </p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Distinct members with confirmed job joining ÷ selected
                  approved cohort members. Multiple offers to one person count
                  once. Select to view these members.
                </p>
              </button>
            </div>
            <section className="glass-panel space-y-5 rounded-3xl p-6">
              <div>
                <h2 className="text-xl font-semibold">
                  Placement journey · recorded stages
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Counts are not a strict conversion funnel: stages can be
                  skipped, interviews cancelled, and older history may be
                  unavailable. Scheduling does not prove attendance.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {model.funnel.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => choose(s.id)}
                    className="glass-row rounded-2xl p-4 text-left hover:ring-1 hover:ring-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <p className="text-xs role-text">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-2xl font-semibold">{s.value}</p>
                    <p className="mt-2 text-sm">{s.label}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: model.funnel[0].value
                            ? `${Math.min(100, (s.value / model.funnel[0].value) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <section className="glass-panel space-y-4 rounded-3xl p-6">
                <h2 className="text-xl font-semibold">
                  Assessment-backed skill gaps
                </h2>
                <p className="text-sm text-muted-foreground">
                  Latest result per member and canonical skill. “Not assessed”
                  means unknown, not unskilled. Targets can differ between
                  assessment issuers.
                </p>
                {model.skills.map((s) => (
                  <div key={s.id} className="glass-row rounded-2xl p-4">
                    <h3 className="font-semibold">{s.label}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => choose("skill:" + s.id)}
                      >
                        {s.below} below target
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => choose("assessed:" + s.id)}
                      >
                        {s.assessed} assessed
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => choose("unassessed:" + s.id)}
                      >
                        {s.unassessed} not assessed
                      </Button>
                    </div>
                  </div>
                ))}
                {!model.skills.length && (
                  <p className="text-sm text-muted-foreground">
                    No industry skill assessment evidence is available for this
                    filtered cohort. Declared skills are not substituted.
                  </p>
                )}
              </section>
              <section className="glass-panel space-y-4 rounded-3xl p-6">
                <h2 className="text-xl font-semibold">Internship follow-up</h2>
                <p className="text-sm text-muted-foreground">
                  Latest report versions only. Faculty review requirements are
                  shown separately from industry review.
                </p>
                {model.queues.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => choose(q.id)}
                    className="glass-row block w-full rounded-2xl p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <p className="flex items-center justify-between gap-3 font-semibold">
                      {q.label}
                      <span className="text-2xl role-text">{q.value}</span>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {q.definition}
                    </p>
                  </button>
                ))}
                <Link
                  className="inline-block text-sm font-semibold role-text"
                  href="/institution/internships"
                >
                  Open internship tracking →
                </Link>
              </section>
            </div>
            <section
              id="command-center-records"
              tabIndex={-1}
              className="glass-panel scroll-mt-24 space-y-4 rounded-3xl p-6"
            >
              <div aria-live="polite">
                <p className="text-xs font-semibold uppercase tracking-widest role-text">
                  Records behind the metric
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {drill?.label} · {drill?.rows.length ?? 0}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {drill?.definition}
                </p>
              </div>
              {drill?.rows.map((r) => (
                <article key={r.id} className="glass-row rounded-2xl p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{r.name}</h3>
                      <p className="mt-1 text-sm">{r.title}</p>
                    </div>
                    <Link
                      href={r.href}
                      className="text-sm font-semibold role-text"
                    >
                      Open workspace ↗
                    </Link>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                    {r.detail}
                  </p>
                  <p className="mt-2 break-all text-[11px] text-muted-foreground">
                    Source record: {r.sourceId}
                  </p>
                </article>
              ))}
              {!drill?.rows.length && (
                <Empty
                  title="No matching records"
                  description="There are no saved records for this metric in the current approved cohort and filters."
                />
              )}
            </section>
            <p className="text-xs leading-5 text-muted-foreground">
              Snapshot generated {new Date(model.generatedAt).toLocaleString()}.
              Sources load independently and refresh every 30 seconds; this is
              not a transactionally synchronized audit report. Export includes
              only the selected cohort and metric evidence, not compensation,
              report files or unrelated records. Handle exported member data
              according to your institution’s access policies.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
