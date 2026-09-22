"use client";
import { usePlatformData, type Application } from "@/lib/platform-store";
import {
  internshipAction,
  useApplicationTracking,
} from "@/lib/application-tracking";
import { Button } from "@/components/ui/button";
import { Field, SaveButton, Tag, useAction } from "./primitives";

export function EngagementControls({
  application,
  canManage,
  canSubmit,
}: {
  application: Pick<Application, "id" | "status">;
  canManage: boolean;
  canSubmit: boolean;
}) {
  const platform = usePlatformData();
  const tracking = useApplicationTracking();
  const action = useAction();
  const data = platform.data;
  const arrangement = tracking.data?.arrangements.find(
    (r) => r.application_id === application.id,
  );
  const applicant = data?.applications.find(
    (a) => a.id === application.id,
  )?.applicantId;
  const isInstitution =
    data?.profile.role === "institution" &&
    data.memberships.some(
      (m) =>
        m.institution_id === data.profile.id &&
        m.member_id === applicant &&
        m.status === "Approved",
    );
  const kind = canManage ? "Mentor" : isInstitution ? "Faculty" : null;
  const candidates =
    data?.directory.filter((p) =>
      kind === "Mentor"
        ? p.role === "industry"
        : p.role === "academician" &&
          data.memberships.some(
            (m) =>
              m.institution_id === data.profile.id &&
              m.member_id === p.id &&
              m.status === "Approved",
          ),
    ) ?? [];
  const assignments =
    tracking.data?.supervisors.filter(
      (s) =>
        s.application_id === application.id &&
        ["Pending", "Accepted"].includes(s.status),
    ) ?? [];
  const offered = application.status === "Offered";
  return (
    <section className="glass-row space-y-4 rounded-2xl p-5">
      <h3 className="font-semibold">Offer, dates & supervision</h3>
      {action.feedback}
      <div className="flex flex-wrap items-center gap-3">
        <Tag>{arrangement?.response ?? "Dates not proposed"}</Tag>
        {arrangement?.start_on && (
          <p className="text-sm">
            {arrangement.start_on} → {arrangement.end_on}
          </p>
        )}
      </div>
      {canManage &&
        offered &&
        (!arrangement || arrangement.response === "Pending") && (
          <form
            key={arrangement?.start_on + ":" + arrangement?.end_on}
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await action.run(
                () =>
                  internshipAction("configure_internship", {
                    app: application.id,
                    begins: String(fd.get("begins")),
                    ends: String(fd.get("ends")),
                  }),
                "Dates proposed to applicant.",
              );
            }}
          >
            <Field label="Start date">
              <input
                required
                type="date"
                name="begins"
                className="field"
                defaultValue={arrangement?.start_on ?? ""}
              />
            </Field>
            <Field label="End date">
              <input
                required
                type="date"
                name="ends"
                className="field"
                defaultValue={arrangement?.end_on ?? ""}
              />
            </Field>
            <SaveButton busy={action.busy}>Propose dates</SaveButton>
          </form>
        )}
      {canSubmit && offered && arrangement?.response === "Pending" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Review the proposed dates before responding. Your response is
            recorded once and the accepted dates cannot be edited by the owner.
          </p>
          <div className="flex flex-wrap gap-3">
            {["Accepted", "Declined"].map((decision) => (
              <Button
                key={decision}
                variant={decision === "Accepted" ? "default" : "outline"}
                disabled={action.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `${decision === "Accepted" ? "Accept" : "Decline"} this internship for ${arrangement.start_on} to ${arrangement.end_on}? Your response cannot be changed in this workflow.`,
                    )
                  )
                    void action.run(
                      () =>
                        internshipAction("respond_internship_offer", {
                          app: application.id,
                          decision,
                        }),
                      "Offer response recorded.",
                    );
                }}
              >
                {decision === "Accepted" ? "Accept offer" : "Decline offer"}
              </Button>
            ))}
          </div>
        </div>
      )}
      {assignments.map((s) => (
        <p key={s.id} className="text-sm">
          {s.kind}:{" "}
          {data?.directory.find((p) => p.id === s.supervisor_id)?.full_name ||
            "Assigned account"}{" "}
          · {s.status}
        </p>
      ))}
      {kind && (offered || assignments.some((s) => s.kind === kind)) && (
        <form
          className="space-y-3 border-t border-border pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const person = String(fd.get("person") || "");
            if (
              !window.confirm(
                person
                  ? `Invite this ${kind.toLowerCase()}? After accepting, they can read internship logs, download private reports, and review reports and milestones. Any current ${kind.toLowerCase()} assignment will be revoked.`
                  : `Revoke the current ${kind.toLowerCase()} assignment?`,
              )
            )
              return;
            await action.run(
              () =>
                internshipAction("assign_internship_supervisor", {
                  app: application.id,
                  person: person || null,
                  assignment_kind: kind,
                }),
              "Supervision assignment updated.",
            );
          }}
        >
          <Field
            label={
              kind === "Mentor"
                ? "Industry mentor account"
                : "Faculty supervisor from your approved members"
            }
          >
            <select name="person" className="field">
              <option value="">Remove assignment</option>
              {(offered ? candidates : []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} · {p.organization}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">
            Invite only an authorized supervisor. Acceptance grants access to
            this internship&apos;s records, not the student&apos;s unrelated
            portfolio or assessments.
          </p>
          <SaveButton busy={action.busy}>
            Update {kind.toLowerCase()}
          </SaveButton>
        </form>
      )}
    </section>
  );
}
