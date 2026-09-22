"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData, exportRecords } from "@/lib/platform-store";
import { useRecruitment } from "@/lib/recruitment";
import { buildIndustryAnalytics } from "@/lib/industry-analytics.mjs";
import { DataState, Empty, Field, PageHeading, Tag } from "./primitives";

export function IndustryCommandCenter() {
  const platform = usePlatformData();
  const recruitment = useRecruitment();
  const [opportunityId, setOpportunityId] = useState("");
  const [selection, setSelection] = useState("review");
  const [refreshing, setRefreshing] = useState(false);
  const ready =
    platform.data && recruitment.data && !platform.error && !recruitment.error;
  const model = ready
    ? buildIndustryAnalytics({
        platform: platform.data,
        recruitment: recruitment.data,
        opportunityId,
      })
    : null;
  const drill = model
    ? [...model.metrics, ...model.queues].find((m) => m.id === selection)
    : null;
  function choose(id: string) {
    setSelection(id);
    const section = document.getElementById("hiring-records");
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  return (
    <DashboardShell role="industry" title="Hiring command center">
      <div className="space-y-7">
        <PageHeading
          eyebrow="Connected industry workspace"
          title="Your next team. Every next step."
          description="Follow your real applicant pipeline, respond to interview requests and distinguish written offers from confirmed joining."
          action={
            <Link href="/industry/post">
              <Button>
                Publish opportunity <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <Tag positive={!!platform.data && !platform.error}>
            Applicant data:{" "}
            {platform.error
              ? "Unavailable"
              : platform.data
                ? "Loaded"
                : "Loading"}
          </Tag>
          <Tag positive={!!recruitment.data && !recruitment.error}>
            Recruitment:{" "}
            {recruitment.error
              ? "Unavailable"
              : recruitment.data
                ? "Loaded"
                : "Loading"}
          </Tag>
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await Promise.allSettled([
                  platform.refresh(),
                  recruitment.refresh(),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            disabled={!model}
            onClick={() => {
              if (model) {
                const { options, ...snapshot } = model;
                exportRecords("industry-hiring-snapshot.json", snapshot);
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export snapshot
          </Button>
        </div>
        {!ready && (
          <>
            <p className="text-sm text-muted-foreground">
              Metrics stay hidden until both sources load. An unavailable source
              is not treated as zero activity.
            </p>
            <DataState {...platform} retry={platform.refresh} />
            <DataState {...recruitment} retry={recruitment.refresh} />
          </>
        )}
        {model && (
          <>
            <div className="glass-panel rounded-3xl p-5">
              <Field label="Opportunity">
                <select
                  className="field"
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                >
                  <option value="">All my opportunities</option>
                  {model.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.type}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="mt-3 text-xs text-muted-foreground">
                Application and interview metrics cover the selected opportunity
                types. Written offer and joining metrics cover Job opportunities
                only.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {model.metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => choose(m.id)}
                  aria-pressed={selection === m.id}
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
              <h2 className="text-xl font-semibold">Follow-up desk</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These queues highlight saved actions and responses. Nothing is
                sent or changed automatically.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {model.queues.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => choose(q.id)}
                    aria-pressed={selection === q.id}
                    className="glass-row rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <p className="flex items-center justify-between gap-4 font-semibold">
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
              id="hiring-records"
              tabIndex={-1}
              className="glass-panel scroll-mt-24 space-y-4 rounded-3xl p-6"
            >
              <div aria-live="polite">
                <p className="text-xs uppercase tracking-widest role-text">
                  Supporting records
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {drill?.label} · {drill?.value ?? 0}
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
                  <p className="mt-3 text-sm text-muted-foreground">
                    {r.detail}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    Application: {r.applicationId} · Source: {r.id}
                  </p>
                </article>
              ))}
              {!drill?.rows.length && (
                <Empty
                  title="No matching records"
                  description="Saved activity for this queue will appear here. Try another opportunity or metric."
                />
              )}
            </section>
            <div className="flex flex-wrap gap-4 text-sm font-semibold role-text">
              <Link href="/industry/candidates">Review candidates →</Link>
              <Link href="/industry/recruitment-tracker">
                Manage interviews and offers →
              </Link>
              <Link href="/industry/programs">Learning programs →</Link>
              <Link href="/industry/internships">Internship tracking →</Link>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Snapshot generated {new Date(model.generatedAt).toLocaleString()}.
              Sources refresh independently every 30 seconds. Counts are not a
              sequential conversion funnel or an audited employment report.
              Export excludes compensation, offer terms and private documents;
              handle candidate information according to your organization’s
              access policies.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
