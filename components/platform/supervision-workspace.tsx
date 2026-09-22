"use client";
import { type Role } from "@/lib/platform-store";
import { internshipAction, useSupervision } from "@/lib/application-tracking";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataState, Empty, PageHeading, Tag, useAction } from "./primitives";
import { InternshipPanel, ApplicationTimeline } from "./application-tracking";

export function SupervisionWorkspace({ role }: { role: Role }) {
  const state = useSupervision();
  const action = useAction();
  return (
    <DashboardShell role={role} title="Assigned supervision">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Connected supervision"
          title="Guide the internships assigned to you."
          description="Accept an invitation to read internship logs, review private reports and approve milestones. Faculty access requires approved membership for you and the applicant at the assigning institution."
        />
        <DataState {...state} retry={state.refresh} />
        {action.feedback}
        {state.data && !state.error && (
          <>
            {state.data.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle>{s.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {s.company} · {s.applicant_name} · {s.kind}
                  </p>
                  <Tag>{s.status}</Tag>
                </CardHeader>
                <CardContent>
                  {s.status === "Pending" &&
                    s.application_status === "Offered" && (
                      <div className="flex gap-3">
                        {["Accepted", "Declined"].map((decision) => (
                          <Button
                            key={decision}
                            disabled={action.busy}
                            variant="outline"
                            onClick={() =>
                              action.run(
                                () =>
                                  internshipAction("respond_supervision", {
                                    invitation: s.id,
                                    decision,
                                  }),
                                "Response saved.",
                              )
                            }
                          >
                            {decision === "Accepted"
                              ? "Accept assignment"
                              : "Decline"}
                          </Button>
                        ))}
                      </div>
                    )}
                  {s.status === "Accepted" && s.can_access && (
                    <>
                      <InternshipPanel
                        application={{
                          id: s.application_id,
                          status: s.application_status,
                        }}
                        canReview
                      />
                      <ApplicationTimeline applicationId={s.application_id} />
                    </>
                  )}
                  {s.status === "Accepted" && !s.can_access && (
                    <p className="text-sm text-muted-foreground">
                      Access is no longer active. Contact the assigning
                      institution.
                    </p>
                  )}
                  {s.status === "Pending" &&
                    s.application_status !== "Offered" && (
                      <p className="text-sm text-muted-foreground">
                        This internship is no longer open for assignment
                        acceptance.
                      </p>
                    )}
                </CardContent>
              </Card>
            ))}
            {!state.data.length && (
              <Empty
                title="No supervision invitations"
                description="An opportunity owner or approved institution can invite you to supervise a specific internship."
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
