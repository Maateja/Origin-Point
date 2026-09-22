"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData } from "@/lib/platform-store";
import {
  useApplicationTracking,
  useSupervision,
} from "@/lib/application-tracking";
import { useLearningPrograms } from "@/lib/learning-programs";
import { useCollaborations } from "@/lib/collaborations";
import { buildAcademicianAnalytics } from "@/lib/academician-analytics.mjs";
import { DataState, Empty, PageHeading, Tag } from "./primitives";

export function AcademicianCommandCenter() {
  const platform = usePlatformData(),
    tracking = useApplicationTracking(),
    learning = useLearningPrograms(),
    collaborations = useCollaborations(),
    supervision = useSupervision();
  const [selection, setSelection] = useState("invitations");
  const [refreshing, setRefreshing] = useState(false);
  const sources = [
    { name: "Profile and applications", state: platform },
    { name: "Engagements", state: tracking },
    { name: "Learning", state: learning },
    { name: "Collaborations", state: collaborations },
    { name: "Supervision", state: supervision },
  ];
  const ready = sources.every((s) => s.state.data && !s.state.error);
  const model = ready
    ? buildAcademicianAnalytics({
        platform: platform.data,
        tracking: tracking.data,
        learning: learning.data,
        collaborations: collaborations.data,
        supervision: supervision.data,
      })
    : null;
  const selected = model
    ? [...model.metrics, ...model.queues].find((m) => m.id === selection)
    : null;
  function choose(id: string) {
    setSelection(id);
    const section = document.getElementById("faculty-records");
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  return (
    <DashboardShell role="academician" title="Faculty command center">
      <div className="space-y-7">
        <PageHeading
          eyebrow="Academia meets industry"
          title="Bring experience back to the classroom."
          description="Your professional development, industry engagements, student supervision and collaborative work—connected through saved records."
          action={
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
              Refresh data
            </Button>
          }
        />
        <nav aria-label="Faculty workspaces" className="flex flex-wrap gap-3">
          {[
            ["Faculty development", "/academician/fdps"],
            ["Industry internships", "/academician/internships"],
            ["Research", "/academician/research"],
            ["Consultancy", "/academician/consultancy"],
            ["Supervision", "/academician/supervision"],
            ["Collaborations", "/academician/collaborations"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="glass-row rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.03] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {label} ↗
            </Link>
          ))}
        </nav>
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
          <>
            <p className="text-sm text-muted-foreground">
              Metrics remain hidden until all sources load. Missing data is not
              treated as zero activity.
            </p>
            {sources
              .filter((s) => !s.state.data || s.state.error)
              .map((s) => (
                <div key={s.name}>
                  <h2 className="mb-2 text-sm font-semibold">{s.name}</h2>
                  <DataState {...s.state} retry={s.state.refresh} />
                </div>
              ))}
          </>
        )}
        {model && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {model.metrics.map((m) => (
                <button
                  key={m.id}
                  aria-pressed={selection === m.id}
                  onClick={() => choose(m.id)}
                  className="glass-panel rounded-3xl p-5 text-left transition-transform hover:scale-[1.02] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <p className="flex justify-between gap-3 text-sm text-muted-foreground">
                    {m.label}
                    <ArrowUpRight className="h-4 w-4 shrink-0 role-text" />
                  </p>
                  <p className="mt-4 text-3xl font-semibold">{m.value}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {m.definition}
                  </p>
                </button>
              ))}
            </div>
            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Your next decisions</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your own development and your supervisory responsibilities stay
                separate. Nothing is accepted or approved automatically.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {model.queues.map((q) => (
                  <button
                    key={q.id}
                    aria-pressed={selection === q.id}
                    onClick={() => choose(q.id)}
                    className="glass-row rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <p className="flex justify-between gap-3 font-semibold">
                      {q.label}
                      <span className="text-2xl role-text">{q.value}</span>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {q.definition}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section
              id="faculty-records"
              tabIndex={-1}
              className="glass-panel scroll-mt-24 space-y-4 rounded-3xl p-6"
            >
              <div aria-live="polite">
                <p className="text-xs uppercase tracking-widest role-text">
                  Supporting records
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {selected?.label} · {selected?.value ?? 0}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected?.definition}
                </p>
              </div>
              {selected?.rows.map((r) => (
                <article key={r.id} className="glass-row rounded-2xl p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-semibold">{r.title}</h3>
                    <Link
                      href={r.href}
                      className="text-sm font-semibold role-text"
                    >
                      Open workspace ↗
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {r.detail}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    Source record: {r.id}
                  </p>
                </article>
              ))}
              {!selected?.rows.length && (
                <Empty
                  title="No records in this view"
                  description="Your saved activity will appear here. Explore faculty opportunities or select another metric."
                />
              )}
            </section>
            <p className="text-xs leading-5 text-muted-foreground">
              Snapshot generated {new Date(model.generatedAt).toLocaleString()}.
              Sources refresh independently every 30 seconds; this is not a
              synchronized audit report. Counts reflect saved participation and
              approvals, not independently verified employment or proficiency.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
