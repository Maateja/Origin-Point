"use client";
import { EngagementControls } from "./internship-engagement";
import { InternshipReports } from "./internship-reports";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  usePlatformData,
  type Application,
  type Role,
} from "@/lib/platform-store";
import {
  useApplicationTracking,
  addMilestone,
  reviewMilestone,
  addInternshipLog,
  type Milestone,
} from "@/lib/application-tracking";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";

export function ApplicationTimeline({
  applicationId,
}: {
  applicationId: string;
}) {
  const tracking = useApplicationTracking();
  const events =
    tracking.data?.events.filter((e) => e.application_id === applicationId) ??
    [];
  return (
    <details className="mt-5 rounded-2xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Application timeline
      </summary>
      <div className="mt-4">
        <DataState {...tracking} retry={tracking.refresh} />
        {tracking.data && !tracking.error && (
          <ol className="space-y-4 border-l border-border pl-4">
            {events.map((event) => (
              <li key={event.id} className="space-y-1">
                <p className="text-sm font-semibold">
                  {event.event_type} · {event.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("en-IN")}
                </p>
                <p className="text-sm">{event.next_step}</p>
                {event.feedback && (
                  <p className="text-xs text-muted-foreground">
                    Feedback: {event.feedback}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recorded progress: {event.progress}%
                </p>
              </li>
            ))}
          </ol>
        )}
        {tracking.data && !events.length && (
          <p className="text-sm text-muted-foreground">
            No timeline events recorded yet.
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          For applications that predate tracking, history begins with an
          explicitly labelled snapshot—not reconstructed past decisions.
        </p>
      </div>
    </details>
  );
}

export function InternshipPanel({
  application,
  canManage = false,
  canSubmit = false,
  canReview = false,
}: {
  application: Pick<Application, "id" | "status">;
  canManage?: boolean;
  canSubmit?: boolean;
  canReview?: boolean;
}) {
  const tracking = useApplicationTracking();
  const action = useAction();
  const arrangement = tracking.data?.arrangements.find(
    (r) => r.application_id === application.id,
  );
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const active =
    application.status === "Offered" &&
    arrangement?.response === "Accepted" &&
    !!arrangement.start_on &&
    arrangement.start_on <= today;
  const milestones =
    tracking.data?.milestones.filter(
      (m) => m.application_id === application.id,
    ) ?? [];
  const logs =
    tracking.data?.logs.filter((l) => l.application_id === application.id) ??
    [];
  const approved = milestones.filter((m) => m.status === "Approved").length;
  return (
    <div className="space-y-5">
      <DataState {...tracking} retry={tracking.refresh} />
      {tracking.data && !tracking.error && (
        <>
          {action.feedback}
          <EngagementControls
            application={application}
            canManage={canManage}
            canSubmit={canSubmit}
          />
          <InternshipReports
            applicationId={application.id}
            active={active}
            canSubmit={canSubmit}
            canReview={canManage || canReview}
            canManage={canManage}
          />
          <div className="glass-row rounded-2xl p-4">
            <p className="font-semibold">
              {approved} of {milestones.length} milestones approved
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {application.status === "Completed"
                ? "The opportunity owner has marked this application completed. Records are now read-only."
                : active
                  ? "The offer is accepted and the start date has been reached. Logs and milestone reviews are available."
                  : "Tracking opens after the applicant accepts the proposed dates and the start date is reached."}
            </p>
          </div>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.id} className="glass-row rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  <Tag positive={m.status === "Approved"}>{m.status}</Tag>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {m.description}
                </p>
                {m.due_on && <p className="mt-2 text-xs">Due {m.due_on}</p>}
                {m.feedback && (
                  <p className="mt-2 text-sm">
                    Supervisor feedback: {m.feedback}
                  </p>
                )}
                {m.reviewed_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Approved {new Date(m.reviewed_at).toLocaleString("en-IN")}
                  </p>
                )}
                {(canManage || canReview) && active && (
                  <MilestoneReview
                    key={m.id + m.reviewed_at + m.feedback}
                    milestone={m}
                  />
                )}
              </div>
            ))}
          </div>
          {!milestones.length && (
            <p className="text-sm text-muted-foreground">
              The opportunity owner has not added milestones yet.
            </p>
          )}
          {canManage && active && (
            <details className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Add milestone
              </summary>
              <form
                className="mt-4 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  if (
                    await action.run(
                      () =>
                        addMilestone({
                          application_id: application.id,
                          title: String(fd.get("title") || ""),
                          description: String(fd.get("description") || ""),
                          due_on: String(fd.get("due_on") || "") || null,
                        }),
                      "Milestone saved.",
                    )
                  )
                    form.reset();
                }}
              >
                <Field label="Milestone title">
                  <input
                    className="field"
                    name="title"
                    required
                    maxLength={160}
                  />
                </Field>
                <Field label="Expected deliverable">
                  <textarea
                    className="field"
                    name="description"
                    maxLength={4000}
                  />
                </Field>
                <Field label="Due date">
                  <input className="field" name="due_on" type="date" />
                </Field>
                <SaveButton busy={action.busy}>Add milestone</SaveButton>
              </form>
            </details>
          )}
          <h3 className="text-lg font-semibold">
            Progress logs & deliverables
          </h3>
          {logs.map((log) => (
            <div key={log.id} className="glass-row rounded-2xl p-4">
              <p className="text-sm font-semibold">
                Week ending {log.week_ending}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {milestones.find((m) => m.id === log.milestone_id)?.title ||
                  "General internship update"}{" "}
                · Submitted {new Date(log.created_at).toLocaleString("en-IN")}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{log.summary}</p>
              {log.evidence_url && (
                <a
                  href={log.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm role-text"
                >
                  Open deliverable →
                </a>
              )}
            </div>
          ))}
          {!logs.length && (
            <p className="text-sm text-muted-foreground">
              No progress logs submitted yet.
            </p>
          )}
          {canSubmit && active && (
            <form
              className="space-y-4 rounded-2xl border border-border p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                if (
                  await action.run(
                    () =>
                      addInternshipLog({
                        application_id: application.id,
                        milestone_id:
                          String(fd.get("milestone_id") || "") || null,
                        week_ending: String(fd.get("week_ending") || ""),
                        summary: String(fd.get("summary") || ""),
                        evidence_url: String(fd.get("evidence_url") || ""),
                      }),
                    "Progress log saved.",
                  )
                )
                  form.reset();
              }}
            >
              <h3 className="font-semibold">Submit progress</h3>
              <p className="text-xs text-muted-foreground">
                Logs are permanent records shared with the opportunity owner and
                approved institution. Submit another log to correct an earlier
                entry.
              </p>
              <Field label="Week ending">
                <input
                  name="week_ending"
                  className="field"
                  required
                  type="date"
                />
              </Field>
              <Field label="Related milestone">
                <select name="milestone_id" className="field">
                  <option value="">General update</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Work completed, blockers and next steps">
                <textarea
                  name="summary"
                  required
                  minLength={10}
                  maxLength={4000}
                  className="field"
                />
              </Field>
              <Field label="Deliverable link (optional)">
                <input
                  name="evidence_url"
                  type="url"
                  pattern="https?://.*"
                  maxLength={2000}
                  className="field"
                />
              </Field>
              <SaveButton busy={action.busy}>Submit log</SaveButton>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function MilestoneReview({ milestone }: { milestone: Milestone }) {
  const action = useAction();
  const [status, setStatus] = useState(milestone.status);
  return (
    <form
      className="mt-4 space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await action.run(
          () =>
            reviewMilestone(
              milestone.id,
              status,
              String(fd.get("feedback") || ""),
            ),
          "Review saved.",
        );
      }}
    >
      {action.feedback}
      <Field label="Review status">
        <select
          className="field"
          value={status}
          onChange={(e) => setStatus(e.target.value as Milestone["status"])}
        >
          <option>Pending</option>
          <option>Approved</option>
        </select>
      </Field>
      <Field label="Feedback for the applicant">
        <textarea
          name="feedback"
          className="field"
          maxLength={4000}
          defaultValue={milestone.feedback}
        />
      </Field>
      <SaveButton busy={action.busy}>Save review</SaveButton>
      <p className="text-xs text-muted-foreground">
        Approval requires a submitted log linked to this milestone.
      </p>
    </form>
  );
}

export function InternshipWorkspace({ role }: { role: Role }) {
  const state = usePlatformData();
  const data = state.data;
  const applications =
    data?.applications.filter(
      (a) =>
        ["Offered", "Completed"].includes(a.status) &&
        data.opportunities.some(
          (o) =>
            o.id === a.opportunityId &&
            [
              "Internship",
              "Apprenticeship",
              "Live Project",
              "Faculty Internship",
            ].includes(o.type),
        ),
    ) ?? [];
  return (
    <DashboardShell role={role} title="Internship tracking">
      <div className="space-y-6">
        <PageHeading
          eyebrow="From selection to delivery"
          title="Keep the work and progress connected."
          description="Accept your offer and dates, then track internship work. Owners and assigned supervisors review milestones; approved institutions follow progress and nominate faculty."
        />
        <DataState {...state} retry={state.refresh} />
        {data && !state.error && (
          <>
            {applications.map((a) => {
              const opportunity = data.opportunities.find(
                (o) => o.id === a.opportunityId,
              );
              return (
                <Card key={a.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle>{opportunity?.title}</CardTitle>
                      <Tag>{a.status}</Tag>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {opportunity?.company} · {a.studentName}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <InternshipPanel
                      application={a}
                      canManage={opportunity?.ownerId === data.profile.id}
                      canSubmit={a.applicantId === data.profile.id}
                    />
                    <ApplicationTimeline applicationId={a.id} />
                  </CardContent>
                </Card>
              );
            })}
            {!applications.length && (
              <Empty
                title="No offered internships to track yet"
                description="An internship, apprenticeship or live project appears here when its opportunity owner moves your application to Offered."
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
