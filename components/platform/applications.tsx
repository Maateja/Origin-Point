"use client";
import { RecruitmentPanel } from "./recruitment";
import { useState } from "react";
import {
  Download,
  MessageSquare,
  Search,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  exportRecords,
  nextStatuses,
  updateApplicationStatus,
  autoShortlistCandidates,
  usePlatformData,
  type Application,
  type Role,
} from "@/lib/platform-store";
import { SkillPassport } from "./skill-passport";
import { ApplicationTimeline, InternshipPanel } from "./application-tracking";
import { CareerPreferenceSummary } from "./student-foundation";
import { DocumentLink } from "./document-link";
import {
  DataState,
  Empty,
  Field,
  Metric,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
export function ApplicationsWorkspace({
  role = "student",
  recruiter = false,
  shortlist = false,
}: {
  role?: Role;
  recruiter?: boolean;
  shortlist?: boolean;
}) {
  const state = usePlatformData();
  const data = state.data;
  const action = useAction();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const source =
    data?.applications?.filter((a) =>
      recruiter
        ? (data?.opportunities ?? []).some(
            (o) => o.id === a.opportunityId && o.ownerId === data?.profile?.id,
          )
        : a.applicantId === data?.profile?.id,
    ) ?? [];
  const visible = source.filter(
    (a) =>
      (!shortlist ||
        ["Shortlisted", "Interview Scheduled", "Offered", "Completed"].includes(
          a.status,
        )) &&
      (filter === "All" || a.status === filter) &&
      [
        a.studentName,
        data?.opportunities?.find((o) => o.id === a.opportunityId)?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <DashboardShell
      role={role}
      title={recruiter ? "Recruitment" : "Applications"}
    >
      <div className="space-y-6">
        <PageHeading
          eyebrow={
            recruiter ? "Your talent pipeline" : "Your opportunity journey"
          }
          title={
            recruiter
              ? "Every application deserves a clear next step."
              : "Keep your next move in view."
          }
          description={
            recruiter
              ? "Review people who applied to your published opportunities. Decisions, feedback, and progress are shared with each applicant."
              : "Follow decisions and mentor feedback on the opportunities you applied to."
          }
          action={
            data && (
              <div className="flex flex-wrap items-center gap-2">
                {recruiter && (
                  <Button
                    className="role-gradient border-0 text-white cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                    disabled={action.busy}
                    onClick={async () => {
                      await action.run(async () => {
                        const ownOpps = (data?.opportunities ?? []).filter(
                          (o) => o.ownerId === data?.profile?.id,
                        );
                        let count = 0;
                        for (const opp of ownOpps) {
                          count += await autoShortlistCandidates(opp.id);
                        }
                        return count;
                      }, "Shortlisted candidates with passing screening scores and clean proctoring.");
                    }}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4 text-amber-300" />
                    Auto-Shortlist Qualified
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => exportRecords("applications.json", source)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            )
          }
        />
        <DataState {...state} retry={state.refresh} />
        {action.feedback}
        {data && !state.error && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Applications" value={source.length} />
              <Metric
                label="In review"
                value={
                  source.filter((a) =>
                    [
                      "Applied",
                      "Under Review",
                      "Shortlisted",
                      "Interview Scheduled",
                    ].includes(a.status),
                  ).length
                }
              />
              <Metric
                label="Offered / completed"
                value={
                  source.filter((a) =>
                    ["Offered", "Completed"].includes(a.status),
                  ).length
                }
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  aria-label="Search applications"
                  className="field !pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a person or opportunity"
                />
              </div>
              <select
                aria-label="Application stage"
                className="field sm:!w-52"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["All", ...Object.keys(nextStatuses)].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              {visible.map((a) => {
                const o = (data?.opportunities ?? []).find(
                  (o) => o.id === a.opportunityId,
                );
                const person = (data?.directory ?? []).find(
                  (p) => p.id === a.applicantId,
                );
                const evidence = (data?.records ?? []).filter(
                  (r) => r.user_id === a.applicantId,
                );
                return (
                  <Card key={a.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-lg font-semibold">
                              {recruiter ? a.studentName : o?.title}
                            </h2>
                            <Tag
                              positive={["Offered", "Completed"].includes(
                                a.status,
                              )}
                            >
                              {a.status}
                            </Tag>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {recruiter ? o?.title : o?.company} · Applied{" "}
                            {new Date(a.appliedAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="rounded-xl role-bg-soft px-3 py-1.5 text-xs font-semibold role-text">
                            {a.matchScore}% skill overlap
                          </div>
                          {a.assessmentScore !== undefined &&
                            a.assessmentScore !== null && (
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                    a.assessmentPassed
                                      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                      : "bg-red-500/15 text-red-500 border border-red-500/30"
                                  }`}
                                >
                                  <ClipboardCheck className="h-3 w-3" />
                                  Exam: {a.assessmentScore}% (
                                  {a.assessmentPassed
                                    ? "Passed"
                                    : "Below Cutoff"}
                                  )
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    a.proctoringTrust === "Verified"
                                      ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                                      : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                  }`}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {a.proctoringTrust} (
                                  {a.proctoringViolations ?? 0} warnings)
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                      {recruiter && (
                        <div className="mt-4 space-y-3">
                          <CareerPreferenceSummary profile={person} />
                          <p className="text-sm text-muted-foreground">
                            {person?.program}
                            {person?.organization
                              ? " · " + person.organization
                              : ""}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(person?.skills ?? []).map((s: string) => (
                              <Tag key={s}>{s}</Tag>
                            ))}
                          </div>
                          <details className="rounded-xl border border-border p-3 text-sm">
                            <summary className="cursor-pointer font-medium">
                              Applicant portfolio (
                              {
                                (evidence ?? []).filter(
                                  (r) => r.kind !== "skill",
                                ).length
                              }{" "}
                              records)
                            </summary>
                            <div className="mt-3 space-y-3">
                              <SkillPassport
                                data={data}
                                userId={a.applicantId}
                              />
                              {evidence
                                .filter((r) => r.kind !== "skill")
                                .map((r) => (
                                  <div key={r.id}>
                                    <p className="font-semibold">
                                      {r.title}{" "}
                                      <span className="text-xs font-normal text-muted-foreground">
                                        · {r.kind} ·{" "}
                                        {r.verified_at
                                          ? "Verified"
                                          : "Self-reported"}
                                      </span>
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {r.organization} {r.description}
                                    </p>
                                    {r.contribution && (
                                      <p className="mt-2 text-xs">
                                        Contribution: {r.contribution}
                                      </p>
                                    )}
                                    {r.credential_id && (
                                      <p className="mt-2 text-xs">
                                        Credential ID: {r.credential_id}
                                      </p>
                                    )}
                                    {!!r.associated_skills?.length && (
                                      <p className="mt-2 text-xs">
                                        Related skills:{" "}
                                        {r.associated_skills.join(", ")}
                                      </p>
                                    )}
                                    {r.url && (
                                      <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs role-text"
                                      >
                                        View evidence →
                                      </a>
                                    )}
                                    {r.document_path && (
                                      <DocumentLink path={r.document_path} />
                                    )}
                                  </div>
                                ))}
                              {!evidence.filter((r) => r.kind !== "skill")
                                .length && (
                                <p className="text-xs text-muted-foreground">
                                  No portfolio evidence added yet.
                                </p>
                              )}
                            </div>
                          </details>
                        </div>
                      )}
                      <div className="mt-5 grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold">Next step</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {a.nextStep}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            Mentor / recruiter feedback
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {a.feedback || "No feedback yet."}
                          </p>
                          {["Offered", "Completed"].includes(a.status) && (
                            <p className="mt-2 text-xs role-text">
                              Completion progress: {a.progress}%
                            </p>
                          )}
                        </div>
                      </div>
                      {recruiter && (
                        <ApplicationEditor
                          key={a.updatedAt}
                          application={a}
                          internship={
                            !!o &&
                            [
                              "Internship",
                              "Apprenticeship",
                              "Live Project",
                              "Faculty Internship",
                              "Job",
                            ].includes(o.type)
                          }
                        />
                      )}
                      <ApplicationTimeline applicationId={a.id} />
                      {o && (
                        <details className="mt-4 rounded-2xl border border-border p-4">
                          <summary className="cursor-pointer text-sm font-semibold">
                            Interviews & placement offers
                          </summary>
                          <div className="mt-4">
                            <RecruitmentPanel
                              application={a}
                              isJob={o.type === "Job"}
                              owner={o.ownerId === data.profile.id}
                              applicant={a.applicantId === data.profile.id}
                            />
                          </div>
                        </details>
                      )}
                      {o &&
                        [
                          "Internship",
                          "Apprenticeship",
                          "Live Project",
                          "Faculty Internship",
                        ].includes(o.type) &&
                        ["Offered", "Completed"].includes(a.status) && (
                          <details className="mt-4 rounded-2xl border border-border p-4">
                            <summary className="cursor-pointer text-sm font-semibold">
                              Internship reports, milestones & completion
                            </summary>
                            <div className="mt-4">
                              <InternshipPanel
                                application={a}
                                canManage={o.ownerId === data.profile.id}
                                canSubmit={a.applicantId === data.profile.id}
                              />
                            </div>
                          </details>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!visible.length && (
              <Empty
                title={
                  recruiter
                    ? "Your pipeline is ready"
                    : "Your journey starts with an application"
                }
                description={
                  recruiter
                    ? "Actual applicants will appear here after they apply to one of your opportunities."
                    : "Apply to a published opportunity to track its progress here."
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
function ApplicationEditor({
  application: a,
  internship,
}: {
  application: Application;
  internship: boolean;
}) {
  const action = useAction();
  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="cursor-pointer text-xs font-semibold role-text">
        Update decision & feedback
      </summary>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await action.run(
            () =>
              updateApplicationStatus(
                a.id,
                String(f.get("status")) as Application["status"],
                String(f.get("nextStep")),
                String(f.get("feedback")),
                Number(f.get("progress")),
              ),
            "Application updated.",
          );
        }}
      >
        {action.feedback}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage">
            <select name="status" defaultValue={a.status} className="field">
              {[
                a.status,
                ...nextStatuses[a.status].filter(
                  (s) => !internship || s !== "Completed",
                ),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Progress (%)">
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              defaultValue={a.progress}
              className="field"
            />
          </Field>
        </div>
        {internship && a.status === "Offered" && (
          <p className="text-xs text-muted-foreground">
            Use the dedicated completion workflow: approved reports for
            internships, or two-party joining confirmation for jobs.
          </p>
        )}
        <Field label="Next step / interview instructions">
          <input
            name="nextStep"
            required
            maxLength={1000}
            defaultValue={a.nextStep}
            className="field"
          />
        </Field>
        <Field label="Feedback visible to applicant">
          <textarea
            name="feedback"
            maxLength={4000}
            defaultValue={a.feedback}
            className="field"
          />
        </Field>
        <SaveButton busy={action.busy}>Save update</SaveButton>
      </form>
    </details>
  );
}
