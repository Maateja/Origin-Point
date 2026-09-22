"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  usePlatformData,
  closeOpportunity,
  type Role,
} from "@/lib/platform-store";
import {
  useLearningPrograms,
  programAction,
  type LearningProgram,
  type ProgramEnrollment,
} from "@/lib/learning-programs";
import { explainReadiness } from "@/lib/readiness.mjs";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
  Metric,
} from "./primitives";

export function LearningPrograms({ role }: { role: Role }) {
  const platform = usePlatformData();
  const state = useLearningPrograms();
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("All");
  const [focused, setFocused] = useState("");
  useEffect(
    () =>
      setFocused(
        new URLSearchParams(window.location.search).get("program") ?? "",
      ),
    [],
  );
  const me = platform.data?.profile;
  const programs = (state.data?.programs ?? [])
    .filter((p) =>
      role === "industry"
        ? p.opportunity.owner_id === me?.id
        : role === "institution" ||
          ["all", role].includes(p.opportunity.audience),
    )
    .filter(
      (p) =>
        (format === "All" || p.format === format) &&
        (!focused || p.id === focused) &&
        [p.opportunity.title, p.opportunity.company, ...p.opportunity.skills]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const evidence =
    platform.data?.evidence.filter((e) => e.user_id === me?.id) ?? [];
  return (
    <DashboardShell role={role} title="Learning programs">
      <div className="space-y-7">
        <PageHeading
          eyebrow="Industry learning network"
          title={
            role === "industry"
              ? "Share expertise. Build the next generation."
              : "Learn with industry. Put it into practice."
          }
          description="Structured programs from registered publishers, with clear outcomes, transparent terms and reviewed work. Completion records participation—not independently verified skill proficiency."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...state} retry={state.refresh} />
        {me && state.data && !state.error && !platform.error && (
          <>
            {role === "industry" && (
              <details className="glass-panel rounded-3xl p-6">
                <summary className="cursor-pointer font-semibold">
                  Publish a professional learning program
                </summary>
                <ProgramPublisher organization={me.organization} />
              </details>
            )}
            {(role === "institution" || role === "industry") && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Visible enrollments"
                  value={state.data.enrollments.length}
                />
                <Metric
                  label="Publisher-reviewed completions"
                  value={
                    state.data.enrollments.filter(
                      (e) => e.status === "Completed",
                    ).length
                  }
                />
                <Metric
                  label="Active enrollments"
                  value={
                    state.data.enrollments.filter(
                      (e) => e.status === "Enrolled",
                    ).length
                  }
                />
              </div>
            )}
            <div className="glass-row flex flex-wrap gap-3 rounded-2xl p-4">
              <input
                className="field flex-1"
                aria-label="Search learning programs"
                placeholder="Search a skill, program or publisher"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="field sm:!w-auto"
                aria-label="Program format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {[
                  "All",
                  "Training",
                  "Workshop",
                  "Certification program",
                  "Mentorship",
                  "FDP",
                ].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              {focused && (
                <Button variant="outline" onClick={() => setFocused("")}>
                  Show all programs
                </Button>
              )}
            </div>
            <div className="grid items-start gap-6 xl:grid-cols-2">
              {programs.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  role={role}
                  userId={me.id}
                  focused={focused === p.id}
                  gaps={explainReadiness(p.opportunity.skills, [], evidence)
                    .filter((g) => g.status === "Below assessment target")
                    .map((g) => g.skill)}
                />
              ))}
            </div>
            {!programs.length && (
              <Empty
                title="No matching published programs"
                description="Programs appear here when an industry publisher supplies the required curriculum, schedule and enrollment details."
              />
            )}
            <p className="text-xs text-muted-foreground">
              Earlier unstructured program listings remain in Marketplace/FDPs
              and retain their existing application workflow. This catalog uses
              dedicated enrollment and does not share your unrelated portfolio.
            </p>
            {role === "industry" && (
              <Link
                className="text-sm font-semibold role-text"
                href="/industry/post"
              >
                Manage earlier opportunity listings →
              </Link>
            )}
            {role === "student" && (
              <Link
                className="text-sm font-semibold role-text"
                href="/student/industry-assessments"
              >
                Reassess skills after learning →
              </Link>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function ProgramCard({
  program: p,
  role,
  userId,
  gaps,
  focused,
}: {
  program: LearningProgram;
  role: Role;
  userId: string;
  gaps: string[];
  focused: boolean;
}) {
  const state = useLearningPrograms();
  const action = useAction();
  const o = p.opportunity;
  const owner = o.owner_id === userId;
  const enrollments =
    state.data?.enrollments.filter((e) => e.program_id === p.id) ?? [];
  const mine = enrollments.find((e) => e.learner_id === userId);
  const open =
    o.status === "Open" &&
    o.deadline >=
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <article
      id={`program-${p.id}`}
      className="glass-panel overflow-hidden rounded-3xl"
    >
      <div className="relative border-b border-border bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-400/10 p-6 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-white/60 bg-white/40 p-3 role-text">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                Published by
              </p>
              <p className="font-semibold">{o.company}</p>
            </div>
          </div>
          <Tag>{open ? "Enrollment open" : "Enrollment closed"}</Tag>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Tag>{p.format}</Tag>
          <Tag>{p.level}</Tag>
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {o.title}
        </h2>
        <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          {o.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {p.starts_on} – {p.ends_on}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {o.work_mode} · {o.location}
          </span>
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {o.duration}
          </span>
        </div>
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          {o.skills.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
        {role === "student" && !!gaps.length && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            Addresses your assessed gaps: <strong>{gaps.join(", ")}</strong>.
            Matched against the latest saved assessment result for each skill;
            enrollment does not guarantee proficiency.
          </div>
        )}
        <div>
          <h3 className="mb-3 font-semibold">What you will learn</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {p.outcomes.map((v, i) => (
              <li key={i} className="flex gap-3">
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 role-text" />
                {v}
              </li>
            ))}
          </ul>
        </div>
        <details
          open={focused || undefined}
          className="rounded-2xl border border-border p-4"
        >
          <summary className="cursor-pointer font-semibold">
            Curriculum & program handbook
          </summary>
          <div className="mt-5 space-y-5">
            <ol className="space-y-3">
              {p.curriculum.map((v, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="role-text font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {v}
                </li>
              ))}
            </ol>
            {[
              ["Program overview", o.description],
              [
                "Who can join",
                `${o.audience === "all" ? "Students and academicians" : o.audience === "student" ? "Students" : "Academicians"}. ${p.prerequisites}`,
              ],
              ["Schedule & time zone", p.schedule],
              ["Instructor / delivery team", p.instructor],
              ["Completion requirements", p.completion_rules],
              ["Credential terms", p.credential_terms],
              ["Publisher contact", p.contact],
            ].map(([title, value]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold">{title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </details>
        <div className="glass-row rounded-2xl p-4">
          <p className="font-semibold">{p.fee_terms}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Enrollment deadline: {o.deadline} · Cohort capacity: {o.seats}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Fees and credential claims are publisher-provided. No payment is
            collected here and no external accreditation is implied.
          </p>
        </div>
        {action.feedback}
        {owner && (
          <Button
            variant="outline"
            disabled={action.busy || !open}
            onClick={() => {
              if (
                window.confirm(
                  "Close new enrollments? Existing learners retain access to submit work.",
                )
              )
                void action.run(async () => {
                  await closeOpportunity(p.id);
                  await state.refresh();
                }, "New enrollment closed.");
            }}
          >
            Close enrollment
          </Button>
        )}
        {["student", "academician"].includes(role) && !mine && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await action.run(
                () =>
                  programAction("enroll_learning_program", {
                    program: p.id,
                    accepted_terms: true,
                  }),
                "Enrollment saved.",
              );
            }}
          >
            <label className="flex items-start gap-3 text-xs leading-5">
              <input type="checkbox" required className="mt-1" />I have read the
              prerequisites, schedule, fees and credential terms. My enrollment
              name and submitted work will be shared with this publisher and my
              approved institution.
            </label>
            <Button type="submit" disabled={action.busy || !open}>
              {action.busy
                ? "Enrolling…"
                : open
                  ? "Enroll in program"
                  : "Enrollment closed"}
            </Button>
          </form>
        )}
        {enrollments.map((e) => (
          <EnrollmentPanel
            key={e.id}
            enrollment={e}
            owner={owner}
            learner={e.learner_id === userId}
            startsOn={p.starts_on}
          />
        ))}
        {(owner || role === "institution") && !enrollments.length && (
          <p className="text-sm text-muted-foreground">
            No enrollments visible to your account for this program.
          </p>
        )}
      </div>
    </article>
  );
}

function EnrollmentPanel({
  enrollment: e,
  owner,
  learner,
  startsOn,
}: {
  enrollment: ProgramEnrollment;
  owner: boolean;
  learner: boolean;
  startsOn: string;
}) {
  const state = useLearningPrograms();
  const action = useAction();
  const submissions = (
    state.data?.submissions.filter((s) => s.enrollment_id === e.id) ?? []
  ).sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  const started =
    startsOn <=
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <details
      className="rounded-2xl border border-border p-4"
      open={learner || undefined}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        {learner ? "Your learning record" : e.learner_name} · {e.status}
      </summary>
      <div className="mt-4 space-y-4">
        {action.feedback}
        <p className="text-xs text-muted-foreground">
          Enrolled {new Date(e.created_at).toLocaleDateString("en-IN")}
          {e.completed_at &&
            ` · Publisher confirmed completion ${new Date(e.completed_at).toLocaleDateString("en-IN")}`}
          . This does not change assessment scores or verify skill proficiency.
        </p>
        {learner && e.status === "Enrolled" && (
          <>
            <Button
              variant="outline"
              disabled={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Withdraw? Re-enrollment is not supported in this cohort.",
                  )
                )
                  void action.run(
                    () =>
                      programAction("withdraw_program_enrollment", {
                        enrollment: e.id,
                      }),
                    "Enrollment withdrawn.",
                  );
              }}
            >
              Withdraw enrollment
            </Button>
            {started ? (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const f = new FormData(form);
                  if (
                    await action.run(
                      () =>
                        programAction("submit_program_work", {
                          enrollment: e.id,
                          summary: String(f.get("summary")),
                          evidence: String(f.get("evidence")),
                        }),
                      "Work submitted for review.",
                    )
                  )
                    form.reset();
                }}
              >
                <Field label="Work completed and learning reflection">
                  <textarea
                    name="summary"
                    className="field"
                    required
                    minLength={20}
                    maxLength={4000}
                  />
                </Field>
                <Field label="Evidence link (HTTPS)">
                  <input
                    name="evidence"
                    className="field"
                    type="url"
                    pattern="https://.*"
                    required
                    maxLength={2000}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Use a link your reviewers can access. External links follow
                  the permissions of the service hosting them; do not include
                  credentials or sensitive personal data.
                </p>
                <SaveButton busy={action.busy}>
                  Submit work for review
                </SaveButton>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Work submissions open on {startsOn}.
              </p>
            )}
          </>
        )}
        {submissions.map((s, i) => (
          <div key={s.id} className="glass-row space-y-3 rounded-xl p-4">
            <p className="text-xs font-semibold">
              {i === 0 ? "Latest submission" : "Earlier submission"} ·{" "}
              {new Date(s.created_at).toLocaleString("en-IN")}
            </p>
            <p className="whitespace-pre-wrap text-sm">{s.summary}</p>
            <a
              href={s.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold role-text"
            >
              Open learner evidence ↗
            </a>
            {state.data?.reviews
              .filter((r) => r.submission_id === s.id)
              .sort(
                (a, b) =>
                  b.created_at.localeCompare(a.created_at) ||
                  b.id.localeCompare(a.id),
              )
              .map((r) => (
                <div key={r.id} className="border-l border-border pl-3">
                  <p className="text-sm font-semibold">
                    {r.decision} · {r.reviewer_name}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{r.feedback}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            {owner && e.status === "Enrolled" && i === 0 && (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  const decision = String(f.get("decision"));
                  if (
                    decision === "Completed" &&
                    !window.confirm(
                      "Confirm the published completion requirements have been met? This makes the learning record read-only.",
                    )
                  )
                    return;
                  await action.run(
                    () =>
                      programAction("review_program_work", {
                        submission: s.id,
                        decision,
                        feedback: String(f.get("feedback")),
                      }),
                    "Review recorded.",
                  );
                }}
              >
                <Field label="Publisher decision">
                  <select name="decision" className="field">
                    <option>Changes requested</option>
                    <option>Completed</option>
                  </select>
                </Field>
                <Field label="Review feedback">
                  <textarea
                    name="feedback"
                    className="field"
                    required
                    minLength={10}
                    maxLength={4000}
                  />
                </Field>
                <SaveButton busy={action.busy}>Record review</SaveButton>
              </form>
            )}
          </div>
        ))}
        {!submissions.length && (
          <p className="text-sm text-muted-foreground">
            No work submitted yet.
          </p>
        )}
      </div>
    </details>
  );
}

function ProgramPublisher({ organization }: { organization: string }) {
  const action = useAction();
  const fields = [
    ["title", "Program title", "text", 4, 160],
    ["description", "Program overview", "area", 24, 10000],
    ["location", "Location / online delivery platform", "text", 2, 200],
    ["duration", "Total commitment (hours and weeks)", "text", 3, 200],
    ["starts_on", "Start date", "date", 0, 0],
    ["ends_on", "End date", "date", 0, 0],
    ["deadline", "Enrollment deadline", "date", 0, 0],
    ["seats", "Cohort capacity (1–500)", "number", 1, 500],
    [
      "schedule",
      "Session schedule, time zone and attendance expectations",
      "area",
      10,
      2000,
    ],
    ["prerequisites", "Eligibility and prerequisites", "area", 10, 3000],
    ["skills", "Skills taught (comma-separated, maximum 20)", "text", 1, 1500],
    [
      "outcomes",
      "Learning outcomes (2–12 lines; each at least 10 characters)",
      "area",
      20,
      6000,
    ],
    [
      "curriculum",
      "Curriculum / sessions (2–20 lines; each at least 10 characters)",
      "area",
      20,
      10000,
    ],
    [
      "instructor",
      "Instructor or delivery team and relevant expertise",
      "area",
      3,
      300,
    ],
    [
      "fee_terms",
      "Fees, taxes and cancellation / refund terms (state if free)",
      "area",
      4,
      1000,
    ],
    [
      "credential_terms",
      "Credential awarded, issuing body and limitations (state if none)",
      "area",
      10,
      2000,
    ],
    [
      "completion_rules",
      "Work, attendance and review required for completion",
      "area",
      10,
      2000,
    ],
    [
      "contact",
      "Published support contact (business email or URL)",
      "text",
      5,
      300,
    ],
  ] as const;
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const payload: Record<string, unknown> = Object.fromEntries(
          f.entries(),
        );
        for (const field of ["outcomes", "curriculum"])
          payload[field] = String(f.get(field))
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        payload.skills = [
          ...new Set(
            String(f.get("skills"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ];
        if (
          !window.confirm(
            "Publish this cohort with the details and terms shown? Program content is immutable after publication; enrollment can be closed.",
          )
        )
          return;
        if (
          await action.run(
            () => programAction("publish_learning_program", { payload }),
            "Program published.",
          )
        )
          form.reset();
      }}
    >
      {action.feedback}
      <p className="text-sm text-muted-foreground">
        Publisher:{" "}
        <strong>
          {organization || "Set your organization in Profile first"}
        </strong>
        . Supply accurate information and only credentials you are authorized to
        offer. Published details are fixed for this cohort; close enrollment and
        publish a new cohort for material changes.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            [
              "format",
              "Format",
              [
                "Training",
                "Workshop",
                "Certification program",
                "Mentorship",
                "FDP",
              ],
            ],
            [
              "level",
              "Level",
              ["Foundation", "Intermediate", "Advanced", "All levels"],
            ],
            ["audience", "Audience", ["student", "academician", "all"]],
            ["work_mode", "Delivery", ["Remote", "Hybrid", "On-site"]],
          ] as const
        ).map(([name, label, options]) => (
          <Field key={name} label={label}>
            <select className="field" name={name}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        ))}
        {fields.map(([name, label, type, min, max]) => (
          <div key={name} className={type === "area" ? "sm:col-span-2" : ""}>
            <Field label={label}>
              {type === "area" ? (
                <textarea
                  className="field min-h-24"
                  name={name}
                  required
                  minLength={min}
                  maxLength={max}
                />
              ) : (
                <input
                  className="field"
                  name={name}
                  type={type}
                  required
                  {...(type === "number"
                    ? { min, max }
                    : type === "text"
                      ? { minLength: min, maxLength: max }
                      : {})}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
      <Button type="submit" disabled={action.busy || !organization.trim()}>
        {action.busy ? "Publishing…" : "Publish program"}
      </Button>
    </form>
  );
}
