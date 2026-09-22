"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData } from "@/lib/platform-store";
import { useApplicationTracking } from "@/lib/application-tracking";
import { useRecruitment } from "@/lib/recruitment";
import { useLearningPrograms } from "@/lib/learning-programs";
import { useLearningGoals } from "@/lib/learning-goals";
import { buildStudentActions } from "@/lib/student-actions.mjs";
import { DataState, Empty, PageHeading, Tag } from "./primitives";

function MatchAdvice({ id }: { id: string }) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Allow sending this role’s required skill names and my assessed
        scores/thresholds to Google Gemini for advice. No name, email, resume or
        documents are sent.
      </label>
      <Button
        variant="outline"
        disabled={!consent || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setText("");
          try {
            const r = await fetch("/api/ai/explain-match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityId: id, consent: true }),
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error || "Advice unavailable.");
            setText(b.text);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Advice unavailable.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Asking Gemini…" : "Explain assessed match with Gemini"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {text && (
        <div aria-live="polite" className="glass-row rounded-2xl p-4">
          <p className="text-xs font-semibold role-text">
            AI-generated guidance · may be inaccurate · not saved
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{text}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Check the evidence above. This is not an eligibility decision and
            changes no records.
          </p>
        </div>
      )}
    </div>
  );
}
export function StudentActionCenter() {
  const platform = usePlatformData(),
    tracking = useApplicationTracking(),
    recruitment = useRecruitment(),
    learning = useLearningPrograms(),
    goals = useLearningGoals();
  const [now, setNow] = useState(() => new Date().toISOString()),
    [limit, setLimit] = useState(6),
    [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);
  const sources = [
    { name: "Profile", state: platform },
    { name: "Internships", state: tracking },
    { name: "Recruitment", state: recruitment },
    { name: "Learning", state: learning },
    { name: "Learning goals", state: goals },
  ];
  const ready = sources.every((s) => s.state.data && !s.state.error);
  const model = ready
    ? buildStudentActions({
        platform: platform.data,
        tracking: tracking.data,
        recruitment: recruitment.data,
        learning: learning.data,
        goals: goals.data,
        now,
      })
    : null;
  return (
    <DashboardShell role="student" title="Student action center">
      <div className="space-y-7">
        <PageHeading
          eyebrow="Your next step, connected"
          title="Turn your progress into possibility."
          description="See what needs attention, understand the evidence behind your matches, and connect learning to the next opportunity."
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
                  setNow(new Date().toISOString());
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              Refresh data
            </Button>
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
          <>
            <p className="text-sm text-muted-foreground">
              Waiting for every source before calculating your next steps. A
              failed request is not zero progress.
            </p>
            {sources
              .filter((s) => !s.state.data || s.state.error)
              .map((s) => (
                <DataState key={s.name} {...s.state} retry={s.state.refresh} />
              ))}
          </>
        )}
        {model && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Applications",
                  model.summary.applications,
                  "/student/applications",
                ],
                [
                  "Active learning enrollments",
                  model.summary.learning,
                  "/student/programs",
                ],
                [
                  "Reviewed learning completions",
                  model.summary.learningCompleted,
                  "/student/programs",
                ],
                [
                  "Report-reviewed internships",
                  model.summary.internshipCompletions,
                  "/student/internships",
                ],
              ].map(([label, value, href]) => (
                <Link
                  key={String(label)}
                  href={String(href)}
                  className="glass-panel rounded-3xl p-5 transition-transform hover:scale-[1.02] motion-reduce:transform-none"
                >
                  <p className="text-sm text-muted-foreground">{label} ↗</p>
                  <p className="mt-3 text-3xl font-semibold">{value}</p>
                </Link>
              ))}
            </div>
            <section className="glass-panel space-y-4 rounded-3xl p-6">
              <h2 className="text-xl font-semibold">What should I do next?</h2>
              <p className="text-sm text-muted-foreground">
                Offer responses first, then interviews and report corrections,
                followed by progress and learning. Dates order actions within
                each group—not AI.
              </p>
              {model.actions.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="glass-row block rounded-2xl p-4 transition-transform hover:scale-[1.01] motion-reduce:transform-none"
                >
                  <h3 className="font-semibold">{a.title} ↗</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {a.detail}
                  </p>
                  {a.due && (
                    <p className="mt-2 text-xs role-text">
                      {new Date(a.due).getTime() < new Date(now).getTime()
                        ? "Date passed"
                        : "Scheduled / due"}
                      : {new Date(a.due).toLocaleString()}
                    </p>
                  )}
                </Link>
              ))}
              {!model.actions.length && (
                <Empty
                  title="No next actions recorded"
                  description="Explore published opportunities or set a learning goal. No activity is invented to fill this space."
                />
              )}
            </section>
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Understand your opportunity matches
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sorted by the share of required skills meeting their latest
                  assessment’s target. This is evidence coverage—not hiring
                  probability or eligibility. Declared skills remain separate.
                </p>
              </div>
              {model.matches.slice(0, limit).map((m) => (
                <article
                  key={m.id}
                  className="glass-panel space-y-4 rounded-3xl p-6"
                >
                  <div>
                    <Tag>{m.type}</Tag>
                    <h3 className="mt-3 text-xl font-semibold">{m.title}</h3>
                    <p className="text-sm text-muted-foreground">{m.company}</p>
                  </div>
                  <p className="font-semibold role-text">
                    {m.total
                      ? `${m.backed} of ${m.total} required skills meet assessment targets`
                      : "No skill requirements published"}
                  </p>
                  <ul className="space-y-2">
                    {m.skills.map((s) => (
                      <li
                        key={s.skill}
                        className="glass-row rounded-xl p-3 text-sm"
                      >
                        <span className="font-semibold">{s.skill}</span> ·{" "}
                        {s.status}
                        {s.declared ? " · also self-declared" : ""}
                        {s.evidence
                          ? ` · ${s.evidence.score}% / issuer target ${s.evidence.threshold}%`
                          : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {m.requiresAssessment
                      ? "An opportunity-specific assessment is required. Skill coverage does not satisfy that gate."
                      : "Review the publisher’s qualifications, dates and requirements before applying."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm font-semibold role-text">
                    <Link href="/student/marketplace">
                      View opportunities & apply ↗
                    </Link>
                    <Link href="/student/readiness">
                      Review readiness & create learning goals ↗
                    </Link>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">
                      Published learning related to unproven skills
                    </h4>
                    {m.programs.length ? (
                      m.programs.map((p) => (
                        <Link
                          key={p.id}
                          href={"/student/programs?program=" + p.id}
                          className="mt-2 block text-sm role-text"
                        >
                          {p.title} ↗
                        </Link>
                      ))
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No matching open learning program is currently
                        published.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Skill overlap is not a quality endorsement or eligibility
                      check. Check prerequisites and availability; completion
                      does not automatically verify proficiency.
                    </p>
                  </div>
                  <MatchAdvice
                    key={
                      m.id + JSON.stringify(m.skills.map((s) => s.evidence?.id))
                    }
                    id={m.id}
                  />
                </article>
              ))}
              {!model.matches.length && (
                <Empty
                  title="No open matching opportunity types"
                  description="No published jobs, internships, apprenticeships or live projects are available for students right now."
                />
              )}
              {model.matches.length > limit && (
                <Button variant="outline" onClick={() => setLimit(limit + 6)}>
                  Show more opportunities
                </Button>
              )}
            </section>
            <p className="text-xs text-muted-foreground">
              Sources refresh independently; this is a current snapshot, not a
              synchronized audit report. AI explanations are optional and
              temporary. Your saved skills, applications, learning goals and
              completion records remain in Supabase.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
