"use client";
import {
  usePlatformData,
  type Application,
  type Role,
} from "@/lib/platform-store";
import { useRecruitment, recruitmentAction } from "@/lib/recruitment";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  Metric,
  useAction,
} from "./primitives";

export function RecruitmentPanel({
  application: a,
  isJob,
  owner,
  applicant,
}: {
  application: Application;
  isJob: boolean;
  owner: boolean;
  applicant: boolean;
}) {
  const state = useRecruitment();
  const action = useAction();
  const interviews = (
    state.data?.interviews.filter((i) => i.application_id === a.id) ?? []
  ).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const offer = state.data?.offers.find((o) => o.application_id === a.id);
  const canSchedule =
    owner && ["Shortlisted", "Interview Scheduled"].includes(a.status);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const deadlinePassed = offer
    ? new Date(offer.expires_at).getTime() <= Date.now()
    : false;
  return (
    <section className="space-y-5">
      <DataState {...state} retry={state.refresh} />
      {action.feedback}
      {state.data && !state.error && (
        <>
          <h3 className="font-semibold">Interview scheduling</h3>
          <p className="text-xs text-muted-foreground">
            Times are displayed and entered in {zone}. Scheduling does not send
            an email or create a calendar invitation.
          </p>
          {interviews.map((i) => (
            <div key={i.id} className="glass-row space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                <Tag>{i.status}</Tag>
                <Tag>{i.response}</Tag>
              </div>
              <p className="font-semibold">
                {new Date(i.starts_at).toLocaleString()} · {i.duration_minutes}{" "}
                minutes
              </p>
              <p className="text-sm">
                {i.mode} · {i.location}
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {i.instructions}
              </p>
              {i.response_note && (
                <p className="whitespace-pre-wrap text-sm">
                  Applicant note: {i.response_note}
                </p>
              )}
              {owner && i.status === "Scheduled" && (
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this interview? The original details remain in history.",
                      )
                    )
                      void action.run(
                        () =>
                          recruitmentAction("cancel_application_interview", {
                            interview: i.id,
                          }),
                        "Interview cancelled.",
                      );
                  }}
                >
                  Cancel interview
                </Button>
              )}
              {applicant &&
                a.status === "Interview Scheduled" &&
                i.status === "Scheduled" &&
                new Date(i.starts_at).getTime() > Date.now() && (
                  <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await action.run(
                        () =>
                          recruitmentAction("respond_application_interview", {
                            interview: i.id,
                            decision: String(f.get("decision")),
                            note: String(f.get("note")),
                          }),
                        "Interview response saved.",
                      );
                    }}
                  >
                    <Field label="Your response">
                      <select name="decision" className="field">
                        <option>Confirmed</option>
                        <option>Reschedule requested</option>
                      </select>
                    </Field>
                    <Field label="Availability note (explain alternative time when rescheduling)">
                      <textarea
                        name="note"
                        className="field"
                        maxLength={2000}
                      />
                    </Field>
                    <SaveButton busy={action.busy}>Send response</SaveButton>
                  </form>
                )}
            </div>
          ))}
          {!interviews.length && (
            <p className="text-sm text-muted-foreground">
              No interview details recorded yet. A recruitment stage alone is
              not a scheduled meeting.
            </p>
          )}
          {canSchedule && (
            <details className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Schedule / replace interview
              </summary>
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    !window.confirm(
                      "Schedule this interview? Any current scheduled interview will be cancelled and preserved in history.",
                    )
                  )
                    return;
                  await action.run(
                    () =>
                      recruitmentAction("schedule_application_interview", {
                        app: a.id,
                        starts: new Date(String(f.get("starts"))).toISOString(),
                        minutes: Number(f.get("minutes")),
                        channel: String(f.get("channel")),
                        place: String(f.get("place")),
                        notes: String(f.get("notes")),
                      }),
                    "Interview scheduled.",
                  );
                }}
              >
                <Field label={`Start time (${zone})`}>
                  <input
                    type="datetime-local"
                    name="starts"
                    className="field"
                    required
                  />
                </Field>
                <Field label="Duration in minutes">
                  <input
                    type="number"
                    name="minutes"
                    className="field"
                    required
                    min={15}
                    max={480}
                  />
                </Field>
                <Field label="Mode">
                  <select name="channel" className="field">
                    <option>Video</option>
                    <option>Phone</option>
                    <option>On-site</option>
                  </select>
                </Field>
                <Field label="Meeting link, phone instructions or venue">
                  <input
                    name="place"
                    className="field"
                    required
                    minLength={3}
                    maxLength={1000}
                  />
                </Field>
                <Field label="Preparation and interview instructions">
                  <textarea
                    name="notes"
                    className="field"
                    required
                    minLength={10}
                    maxLength={4000}
                  />
                </Field>
                <SaveButton busy={action.busy}>Schedule interview</SaveButton>
              </form>
            </details>
          )}
          {isJob && (
            <div className="space-y-4 border-t border-border pt-5">
              <h3 className="font-semibold">Placement offer & joining</h3>
              {offer ? (
                <div className="glass-row space-y-4 rounded-2xl p-5">
                  <Tag positive={!!offer.applicant_joined_at}>
                    {offer.applicant_joined_at
                      ? "Joining confirmed by both parties"
                      : offer.response === "Pending" && deadlinePassed
                        ? "Expired (no response)"
                        : offer.response}
                  </Tag>
                  <h4 className="text-lg font-semibold">
                    {offer.title} · {offer.organization}
                  </h4>
                  <p className="whitespace-pre-wrap text-sm">
                    Compensation: {offer.compensation}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {offer.terms}
                  </p>
                  <p className="text-sm">
                    Proposed joining: {offer.joining_on} · Response deadline:{" "}
                    {new Date(offer.expires_at).toLocaleString()}
                  </p>
                  {applicant &&
                    offer.response === "Pending" &&
                    !deadlinePassed && (
                      <div className="flex flex-wrap gap-3">
                        {["Accepted", "Declined"].map((decision) => (
                          <Button
                            key={decision}
                            variant="outline"
                            disabled={action.busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${decision === "Accepted" ? "Accept" : "Decline"} these offer terms? This response cannot be changed in this workflow.`,
                                )
                              )
                                void action.run(
                                  () =>
                                    recruitmentAction(
                                      "respond_placement_offer",
                                      { offer: offer.id, decision },
                                    ),
                                  "Offer response recorded.",
                                );
                            }}
                          >
                            {decision === "Accepted"
                              ? "Accept offer"
                              : "Decline offer"}
                          </Button>
                        ))}
                      </div>
                    )}
                  {owner && offer.response === "Pending" && (
                    <Button
                      variant="outline"
                      disabled={action.busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Withdraw this pending offer? Replacement offers are not supported in this workflow.",
                          )
                        )
                          void action.run(
                            () =>
                              recruitmentAction("withdraw_placement_offer", {
                                offer: offer.id,
                              }),
                            "Offer withdrawn.",
                          );
                      }}
                    >
                      Withdraw pending offer
                    </Button>
                  )}
                  {offer.response === "Accepted" && (
                    <>
                      <p className="text-sm">
                        {offer.employer_joined_at
                          ? `Employer reported joining on ${new Date(offer.employer_joined_at).toLocaleDateString()}`
                          : "Employer has not reported joining."}
                      </p>
                      {offer.applicant_joined_at && (
                        <p className="text-sm">
                          Applicant confirmed on{" "}
                          {new Date(
                            offer.applicant_joined_at,
                          ).toLocaleDateString()}
                        </p>
                      )}
                      {((owner && !offer.employer_joined_at) ||
                        (applicant &&
                          offer.employer_joined_at &&
                          !offer.applicant_joined_at)) && (
                        <Button
                          disabled={
                            action.busy ||
                            offer.joining_on >
                              new Date().toLocaleDateString("en-CA", {
                                timeZone: "Asia/Kolkata",
                              })
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                "Confirm that joining actually occurred? This records your account confirmation, not just offer acceptance.",
                              )
                            )
                              void action.run(
                                () =>
                                  recruitmentAction(
                                    "record_placement_joining",
                                    { offer: offer.id },
                                  ),
                                "Joining confirmation recorded.",
                              );
                          }}
                        >
                          {owner
                            ? "Report actual joining"
                            : "Confirm I have joined"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No written placement offer issued. An Offered stage alone is
                    not an accepted offer.
                  </p>
                  {owner &&
                    ["Shortlisted", "Interview Scheduled", "Offered"].includes(
                      a.status,
                    ) && (
                      <details className="rounded-2xl border border-border p-4">
                        <summary className="cursor-pointer text-sm font-semibold">
                          Issue written offer
                        </summary>
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            if (
                              !window.confirm(
                                "Issue these fixed offer terms? Check compensation, conditions and dates. Terms cannot be edited or replaced after issuance.",
                              )
                            )
                              return;
                            await action.run(
                              () =>
                                recruitmentAction("issue_placement_offer", {
                                  app: a.id,
                                  pay: String(f.get("pay")),
                                  conditions: String(f.get("terms")),
                                  joining: String(f.get("joining")),
                                  expires: new Date(
                                    String(f.get("expires")),
                                  ).toISOString(),
                                }),
                              "Placement offer issued.",
                            );
                          }}
                        >
                          <Field label="Compensation (currency, fixed/variable breakdown and payment period)">
                            <textarea
                              name="pay"
                              className="field"
                              required
                              minLength={3}
                              maxLength={1000}
                            />
                          </Field>
                          <Field label="Written terms (location, role, conditions, probation and contact)">
                            <textarea
                              name="terms"
                              className="field"
                              required
                              minLength={20}
                              maxLength={5000}
                            />
                          </Field>
                          <Field label="Proposed joining date (Asia/Kolkata)">
                            <input
                              name="joining"
                              type="date"
                              className="field"
                              required
                            />
                          </Field>
                          <Field label={`Offer response deadline (${zone})`}>
                            <input
                              name="expires"
                              type="datetime-local"
                              className="field"
                              required
                            />
                          </Field>
                          <SaveButton busy={action.busy}>
                            Issue placement offer
                          </SaveButton>
                        </form>
                      </details>
                    )}
                </>
              )}
              <p className="text-xs text-muted-foreground">
                These are account-recorded recruitment terms and confirmations,
                not an e-signed employment contract or independent proof of
                employment. Joining is counted only when both parties confirm
                it.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function RecruitmentWorkspace({ role }: { role: Role }) {
  const platform = usePlatformData();
  const state = useRecruitment();
  const data = platform.data;
  const apps =
    data?.applications.filter((a) =>
      ["Shortlisted", "Interview Scheduled", "Offered", "Completed"].includes(
        a.status,
      ),
    ) ?? [];
  return (
    <DashboardShell role={role} title="Recruitment tracker">
      <div className="space-y-6">
        <PageHeading
          eyebrow="From conversation to joining"
          title="Keep every next step clear."
          description="Schedule interviews, respond to written offers and confirm actual joining. Approved institutions can follow the same records without acting on behalf of either party."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...state} retry={state.refresh} />
        {data && state.data && !platform.error && !state.error && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Written job offers"
                value={state.data.offers.length}
              />
              <Metric
                label="Accepted offers"
                value={
                  state.data.offers.filter((o) => o.response === "Accepted")
                    .length
                }
              />
              <Metric
                label="Confirmed joinings"
                value={
                  state.data.offers.filter(
                    (o) => o.applicant_joined_at && o.employer_joined_at,
                  ).length
                }
              />
            </div>
            {apps.map((a) => {
              const o = data.opportunities.find(
                (o) => o.id === a.opportunityId,
              );
              return (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle>
                      {o?.title} · {a.studentName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {o?.company} · {a.status}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RecruitmentPanel
                      application={a}
                      isJob={o?.type === "Job"}
                      owner={o?.ownerId === data.profile.id}
                      applicant={a.applicantId === data.profile.id}
                    />
                  </CardContent>
                </Card>
              );
            })}
            {!apps.length && (
              <Empty
                title="No shortlisted applications yet"
                description="Interview and offer workflows become available after an application is shortlisted."
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
