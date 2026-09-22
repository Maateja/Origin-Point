"use client";
import {
  useApplicationTracking,
  submitInternshipReport,
  internshipAction,
  openInternshipReport,
  type InternshipCompletion,
} from "@/lib/application-tracking";
import { Button } from "@/components/ui/button";
import { CertificateControls } from "./certificate-controls";
import { Field, SaveButton, Tag, useAction, DataState } from "./primitives";

export function CompletionEvidence({
  completion: c,
}: {
  completion: InternshipCompletion;
}) {
  const tracking = useApplicationTracking();
  const action = useAction();
  const report = tracking.data?.reports.find((r) => r.id === c.report_id);
  const reviews =
    tracking.data?.reviews.filter(
      (r) => r.id === c.industry_review_id || r.id === c.faculty_review_id,
    ) ?? [];
  return (
    <div className="glass-row space-y-3 rounded-2xl p-5">
      <Tag positive>Report-reviewed completion</Tag>
      <h3 className="font-semibold">
        {c.title} · {c.organization}
      </h3>
      <p className="text-sm">
        Agreed dates: {c.start_on} → {c.end_on}
      </p>
      <p className="text-sm">
        Confirmed by {c.confirmed_name} on{" "}
        {new Date(c.created_at).toLocaleDateString("en-IN")}
      </p>
      {reviews.map((r) => (
        <p key={r.id} className="text-sm">
          {r.review_role} reviewer: {r.reviewer_name} · {r.feedback}
        </p>
      ))}
      {action.feedback}
      {report && (
        <Button
          variant="outline"
          onClick={() =>
            action.run(
              () => openInternshipReport(report.document_path),
              "Download prepared.",
            )
          }
        >
          Download reviewed final report
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Recorded approval by platform accounts, not independent accreditation.
        Agreed dates are distinct from the actual confirmation date.
      </p>
      <CertificateControls completion={c} />
    </div>
  );
}

export function ReviewedExperiences({ userId }: { userId: string }) {
  const tracking = useApplicationTracking();
  const records =
    tracking.data?.completions.filter((c) => c.applicant_id === userId) ?? [];
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Reviewed internship evidence</h2>
      <DataState {...tracking} retry={tracking.refresh} />
      {records.map((c) => (
        <CompletionEvidence key={c.id} completion={c} />
      ))}
      {tracking.data && !tracking.error && !records.length && (
        <p className="text-sm text-muted-foreground">
          No report-reviewed completion records yet. Earlier employer-marked
          experiences remain listed separately.
        </p>
      )}
    </section>
  );
}

export function InternshipReports({
  applicationId,
  active,
  canSubmit,
  canReview,
  canManage,
}: {
  applicationId: string;
  active: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canManage: boolean;
}) {
  const tracking = useApplicationTracking();
  const action = useAction();
  const reports = (
    tracking.data?.reports.filter((r) => r.application_id === applicationId) ??
    []
  ).sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  const completion = tracking.data?.completions.find(
    (c) => c.application_id === applicationId,
  );
  return (
    <section className="glass-panel space-y-5 rounded-3xl p-5">
      <div>
        <h3 className="text-lg font-semibold">Reports & completion review</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Private PDF evidence, correction requests and traceable approvals. New
          submissions preserve earlier versions; approvals do not carry forward.
        </p>
      </div>
      {action.feedback}
      {completion && <CompletionEvidence completion={completion} />}
      {active && canSubmit && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const file = fd.get("file") as File;
            if (
              await action.run(
                () =>
                  submitInternshipReport(
                    applicationId,
                    String(fd.get("kind")),
                    String(fd.get("title")),
                    String(fd.get("summary")),
                    file,
                  ),
                "Report submitted for review.",
              )
            )
              form.reset();
          }}
        >
          <Field label="Report type">
            <select className="field" name="kind">
              <option>Progress</option>
              <option>Final</option>
            </select>
          </Field>
          <Field label="Report title">
            <input className="field" name="title" required maxLength={160} />
          </Field>
          <Field label="Work summary">
            <textarea
              className="field"
              name="summary"
              required
              minLength={10}
              maxLength={4000}
            />
          </Field>
          <Field label="PDF report or project evidence · maximum 10 MB">
            <input
              className="field"
              type="file"
              name="file"
              required
              accept="application/pdf,.pdf"
            />
          </Field>
          <SaveButton busy={action.busy}>Submit report</SaveButton>
        </form>
      )}
      {!reports.length && (
        <p className="text-sm text-muted-foreground">
          No reports submitted yet.
        </p>
      )}
      {reports.map((r) => {
        const latest = reports.find((p) => p.kind === r.kind)?.id === r.id;
        const reviews = (
          tracking.data?.reviews.filter((v) => v.report_id === r.id) ?? []
        ).sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at) ||
            b.id.localeCompare(a.id),
        );
        return (
          <div key={r.id} className="glass-row space-y-3 rounded-2xl p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h4 className="font-semibold">{r.title}</h4>
              <Tag>
                {r.kind} · {latest ? "Latest version" : "Earlier version"}
              </Tag>
            </div>
            <p className="whitespace-pre-wrap text-sm">{r.summary}</p>
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(r.created_at).toLocaleString("en-IN")}
            </p>
            <Button
              variant="outline"
              disabled={action.busy}
              onClick={() =>
                action.run(
                  () => openInternshipReport(r.document_path),
                  "Download prepared.",
                )
              }
            >
              Download private PDF
            </Button>
            {!reviews.length && (
              <p className="text-sm text-muted-foreground">Awaiting review</p>
            )}
            {reviews.map((v) => (
              <div key={v.id} className="border-l border-border pl-3">
                <p className="text-sm font-medium">
                  {v.review_role} · {v.reviewer_name} · {v.decision}
                  {reviews.find((x) => x.review_role === v.review_role)?.id ===
                  v.id
                    ? " · Latest decision"
                    : " · Earlier decision"}
                </p>
                <p className="whitespace-pre-wrap text-sm">{v.feedback}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
            {active && canReview && latest && (
              <form
                className="space-y-3 border-t border-border pt-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  if (
                    await action.run(
                      () =>
                        internshipAction("review_internship_report", {
                          report: r.id,
                          result: String(fd.get("decision")),
                          comments: String(fd.get("feedback")),
                        }),
                      "Review recorded.",
                    )
                  )
                    form.reset();
                }}
              >
                <Field label="Decision">
                  <select className="field" name="decision">
                    <option>Changes requested</option>
                    <option>Approved</option>
                  </select>
                </Field>
                <Field label="Review feedback">
                  <textarea
                    required
                    minLength={10}
                    maxLength={4000}
                    className="field"
                    name="feedback"
                  />
                </Field>
                <SaveButton busy={action.busy}>Record review</SaveButton>
              </form>
            )}
          </div>
        );
      })}
      {canManage && active && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Completion requires an approved latest final report, approved
            milestones, and faculty approval if faculty supervision is assigned.
            Confirmation freezes internship work and saves evidence to the
            portfolio.
          </p>
          <Button
            disabled={action.busy}
            onClick={() => {
              if (
                window.confirm(
                  "Confirm completion? Reports and internship work will become read-only.",
                )
              )
                void action.run(
                  () =>
                    internshipAction("complete_reviewed_internship", {
                      app: applicationId,
                    }),
                  "Completion confirmed and portfolio evidence saved.",
                );
            }}
          >
            Confirm reviewed completion
          </Button>
        </div>
      )}
    </section>
  );
}
