"use client";
import Link from "next/link";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  usePlatformData,
  ownSkills,
  isOpportunityOpen,
  type Opportunity,
} from "@/lib/platform-store";
import {
  createLearningGoal,
  updateLearningGoal,
  useLearningGoals,
  type LearningGoal,
} from "@/lib/learning-goals";
import { explainReadiness } from "@/lib/readiness.mjs";
import { skillKey } from "@/lib/skill-taxonomy.mjs";
import { useLearningPrograms } from "@/lib/learning-programs";
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
import { SkillSuggestions } from "./skill-suggestions";

function resourcesFor(skill: string, opportunities: Opportunity[]) {
  return opportunities.filter(
    (o) =>
      ["Training", "Workshop", "Mentorship"].includes(o.type) &&
      ["student", "all"].includes(o.audience) &&
      isOpportunityOpen(o) &&
      o.skills.some((s) => skillKey(s) === skillKey(skill)),
  );
}

export function LearningPlan({
  initialTarget = "",
}: {
  initialTarget?: string;
}) {
  const platform = usePlatformData();
  const goals = useLearningGoals();
  const action = useAction();
  const [targetId, setTargetId] = useState(initialTarget);
  const [archived, setArchived] = useState(false);
  const data = platform.data;
  const opportunities =
    data?.opportunities.filter((o) =>
      ["student", "all"].includes(o.audience),
    ) ?? [];
  const target = opportunities.find((o) => o.id === targetId);
  const mine = goals.data?.filter((g) => g.user_id === data?.profile.id) ?? [];
  const active = mine.filter((g) => !g.archived);
  const gaps = explainReadiness(
    target?.skills ?? [],
    ownSkills(data),
    data?.evidence.filter((e) => e.user_id === data.profile.id) ?? [],
  ).filter((r) => r.status !== "Assessment-backed");
  const completed = active.filter((g) => g.status === "Completed").length;
  return (
    <DashboardShell role="student" title="Learning plan">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Turn gaps into progress"
          title="Your next skill, one goal at a time."
          description="Build a plan from actual opportunity requirements or set your own goal. Saved goals are shared with your approved institution, not recruiters. Completion is self-reported and does not certify a skill."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...goals} retry={goals.refresh} />
        {data && goals.data && !platform.error && !goals.error && (
          <>
            {action.feedback}
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Active goals" value={active.length} />
              <Metric
                label="In progress"
                value={active.filter((g) => g.status === "In progress").length}
              />
              <Metric
                label="Self-reported completion"
                value={
                  active.length
                    ? Math.round((completed * 100) / active.length) + "%"
                    : "—"
                }
                detail={`${completed} completed goals; not a readiness score`}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Plan around an opportunity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Target opportunity">
                  <select
                    className="field"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">Choose a target</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} · {o.company}
                        {isOpportunityOpen(o) ? "" : " (closed)"}
                      </option>
                    ))}
                  </select>
                </Field>
                {target &&
                  gaps.map((gap) => {
                    const exists = active.some(
                      (g) =>
                        g.target_id === target.id &&
                        skillKey(g.skill) === skillKey(gap.skill),
                    );
                    return (
                      <div
                        key={gap.skill}
                        className="glass-row flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                      >
                        <div>
                          <p className="font-semibold">{gap.skill}</p>
                          <p className="text-xs text-muted-foreground">
                            {gap.status} ·{" "}
                            {resourcesFor(gap.skill, opportunities).length}{" "}
                            matching published learning programmes
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          disabled={exists || action.busy}
                          onClick={() =>
                            action.run(
                              () =>
                                createLearningGoal({
                                  skill: gap.skill,
                                  target_id: target.id,
                                }),
                              "Learning goal saved.",
                            )
                          }
                        >
                          {exists ? "Already in your plan" : "Add goal"}
                        </Button>
                      </div>
                    );
                  })}
                {target && !gaps.length && (
                  <p className="text-sm text-muted-foreground">
                    {target.skills.length
                      ? "Current assessment evidence covers the listed skills. This is not a full eligibility check."
                      : "This opportunity has no stated skill requirements."}
                  </p>
                )}
                {!opportunities.length && (
                  <p className="text-sm text-muted-foreground">
                    No student opportunities are published yet. You can still
                    add a personal goal below.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add a personal goal</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    if (
                      await action.run(
                        () =>
                          createLearningGoal({
                            skill: String(fd.get("skill") || ""),
                            due_on: String(fd.get("due_on") || ""),
                          }),
                        "Learning goal saved.",
                      )
                    )
                      form.reset();
                  }}
                >
                  <Field label="Skill">
                    <input
                      name="skill"
                      required
                      maxLength={160}
                      list="learning-skill-options"
                      className="field"
                    />
                    <SkillSuggestions id="learning-skill-options" />
                  </Field>
                  <Field label="Target date (optional)">
                    <input type="date" name="due_on" className="field" />
                  </Field>
                  <SaveButton busy={action.busy}>Add goal</SaveButton>
                </form>
              </CardContent>
            </Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {archived ? "Archived goals" : "Your saved goals"}
              </h2>
              <Button variant="outline" onClick={() => setArchived(!archived)}>
                {archived ? "Show active" : "Show archived"}
              </Button>
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-2">
              {mine
                .filter((g) => g.archived === archived)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((g) => (
                  <GoalCard
                    key={g.id + g.updated_at}
                    goal={g}
                    opportunities={opportunities}
                  />
                ))}
            </div>
            {!mine.some((g) => g.archived === archived) && (
              <Empty
                title={
                  archived
                    ? "No archived goals"
                    : "Your learning plan starts here"
                }
                description="Create a goal from a real skill gap or choose a skill you want to develop."
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function GoalCard({
  goal,
  opportunities,
}: {
  goal: LearningGoal;
  opportunities: Opportunity[];
}) {
  const programs = useLearningPrograms();
  const action = useAction();
  const [status, setStatus] = useState(goal.status);
  const choices = resourcesFor(goal.skill, opportunities);
  const linked = opportunities.find((o) => o.id === goal.resource_id);
  const target = opportunities.find((o) => o.id === goal.target_id);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{goal.skill}</CardTitle>
          <Tag>
            {goal.status === "Completed"
              ? "Completed · self-reported"
              : goal.status}
          </Tag>
        </div>
        <p className="text-xs text-muted-foreground">
          {target
            ? "Target: " + target.title
            : goal.target_id
              ? "Target no longer available"
              : "Personal learning goal"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.feedback}
        {goal.archived ? (
          <Button
            variant="outline"
            disabled={action.busy}
            onClick={() =>
              action.run(
                () => updateLearningGoal(goal.id, { archived: false }),
                "Goal restored.",
              )
            }
          >
            Restore goal
          </Button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await action.run(
                () =>
                  updateLearningGoal(goal.id, {
                    status,
                    resource_id: String(fd.get("resource_id") || "") || null,
                    due_on: String(fd.get("due_on") || "") || null,
                    notes: String(fd.get("notes") || ""),
                    evidence_url: String(fd.get("evidence_url") || ""),
                  }),
                "Progress saved.",
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className="field"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as LearningGoal["status"])
                  }
                >
                  {["Planned", "In progress", "Completed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target date">
                <input
                  className="field"
                  type="date"
                  name="due_on"
                  defaultValue={goal.due_on ?? ""}
                />
              </Field>
            </div>
            <Field
              label="Published learning programme"
              hint="Linking a program does not enroll you. Open its details to review the terms and enroll."
            >
              <select
                className="field"
                name="resource_id"
                defaultValue={goal.resource_id ?? ""}
              >
                <option value="">Self-directed learning / no programme</option>
                {goal.resource_id &&
                  !choices.some((o) => o.id === goal.resource_id) && (
                    <option value={goal.resource_id}>
                      {linked?.title ?? "Previously linked programme"} (no
                      longer open)
                    </option>
                  )}
                {choices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} · {o.company}
                  </option>
                ))}
              </select>
            </Field>
            {!choices.length && (
              <p className="text-xs text-muted-foreground">
                No open programme matches this skill. You can record
                self-directed learning without an invented recommendation.
              </p>
            )}
            {linked && (
              <Link
                href={
                  programs.data?.programs.some((p) => p.id === linked.id)
                    ? "/student/programs?program=" + linked.id
                    : "/student/marketplace?opportunity=" + linked.id
                }
                className="inline-block text-sm role-text"
              >
                Open linked programme →
              </Link>
            )}
            <Field
              label="Progress notes / completion reflection"
              hint="Explain what you learned. Required to mark a goal complete."
            >
              <textarea
                className="field"
                name="notes"
                maxLength={4000}
                required={status === "Completed"}
                defaultValue={goal.notes}
              />
            </Field>
            <Field label="Evidence link (optional)">
              <input
                className="field"
                type="url"
                pattern="https?://.*"
                name="evidence_url"
                maxLength={2000}
                placeholder="https://"
                defaultValue={goal.evidence_url}
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <SaveButton busy={action.busy}>Save progress</SaveButton>
              <Button
                type="button"
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Archive this saved goal? Unsaved edits will not be kept. You can restore it later.",
                    )
                  )
                    void action.run(
                      () => updateLearningGoal(goal.id, { archived: true }),
                      "Goal archived.",
                    );
                }}
              >
                Archive
              </Button>
            </div>
          </form>
        )}
        {goal.completed_at && (
          <p className="text-xs text-muted-foreground">
            Completion recorded{" "}
            {new Date(goal.completed_at).toLocaleDateString("en-IN")}.{" "}
            <Link href="/student/industry-assessments" className="role-text">
              Find an assessment to demonstrate your progress →
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberLearningSummary({ userId }: { userId: string }) {
  const goals = useLearningGoals();
  if (goals.error)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Learning-plan progress unavailable.
      </p>
    );
  if (!goals.data)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Loading learning-plan progress…
      </p>
    );
  const active = goals.data.filter((g) => g.user_id === userId && !g.archived);
  return (
    <details className="mt-3 rounded-xl border border-border p-3 text-xs">
      <summary className="cursor-pointer">
        Learning plan: {active.filter((g) => g.status === "Completed").length}/
        {active.length} self-reported complete
      </summary>
      <div className="mt-3 space-y-2">
        {active.map((g) => (
          <p key={g.id}>
            {g.skill} · {g.status}
            {g.due_on ? " · Due " + g.due_on : ""}
          </p>
        ))}
        {!active.length && <p>No active goals saved.</p>}
      </div>
    </details>
  );
}
