"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  usePlatformData,
  ownSkills,
  isOpportunityOpen,
} from "@/lib/platform-store";
import { useIndustryAssessments } from "@/lib/industry-assessments";
import { explainReadiness } from "@/lib/readiness.mjs";
import { skillKey } from "@/lib/skill-taxonomy.mjs";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  Tag,
  Metric,
} from "./primitives";
import { SkillPassport } from "./skill-passport";
export function ReadinessWorkspace() {
  const state = usePlatformData();
  const catalogue = useIndustryAssessments();
  const data = state.data;
  const [selected, setSelected] = useState("");
  const openings =
    data?.opportunities.filter((o) =>
      ["student", "all"].includes(o.audience),
    ) ?? [];
  const target = openings.find((o) => o.id === selected);
  const evidence =
    data?.evidence?.filter((e) => e.user_id === data?.profile?.id) ?? [];
  const requirements = explainReadiness(
    target?.skills ?? [],
    ownSkills(data),
    evidence,
  );
  const assessments =
    catalogue.data?.filter(
      (a) =>
        a.opportunity_id === target?.id &&
        a.status === "Published" &&
        !catalogue.data?.some(
          (n) => n.supersedes === a.id && n.status === "Published",
        ),
    ) ?? [];
  const missing = requirements
    .filter((r) => r.status !== "Assessment-backed")
    .map((r) => skillKey(r.skill));
  const training =
    data?.opportunities.filter(
      (o) =>
        o.id !== target?.id &&
        ["Training", "Workshop", "Mentorship"].includes(o.type) &&
        ["student", "all"].includes(o.audience) &&
        isOpportunityOpen(o) &&
        o.skills.some((s) => missing.includes(skillKey(s))),
    ) ?? [];
  return (
    <DashboardShell role="student" title="Career readiness">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeading
          eyebrow="Know your next step"
          title="Readiness you can explain."
          description="Select an opportunity to compare its stated skills with your claims and recorded assessment evidence. No inferred qualifications or opaque employability score."
        />
        <DataState {...state} retry={state.refresh} />
        {data && !state.error && (
          <>
            <Field label="Target opportunity">
              <select
                className="field"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Choose an opportunity</option>
                {openings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} · {o.company}
                  </option>
                ))}
              </select>
            </Field>
            {!openings.length && (
              <Empty
                title="No opportunity requirements yet"
                description="Your readiness map will use requirements published by real organisations."
              />
            )}
            {target && (
              <>
                <Card className="role-gradient-subtle">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Target className="mt-1 h-5 w-5 role-text" />
                      <div>
                        <h2 className="font-display text-xl font-semibold">
                          {target.title}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {target.company} · {target.location}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Tag positive={isOpportunityOpen(target)}>
                            {isOpportunityOpen(target)
                              ? "Applications open"
                              : "Applications closed"}
                          </Tag>
                          <Tag>Audience includes students</Tag>
                        </div>
                        <p className="mt-4 text-xs leading-5 text-muted-foreground">
                          Qualification, availability, and proficiency rules are
                          not configured in this version. These checks do not
                          establish full eligibility. Evidence uses curated
                          naming aliases and the most recent result, not just
                          your best score.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    label="Unique required skills"
                    value={requirements.length}
                  />
                  <Metric
                    label="Assessment-backed"
                    value={
                      requirements.filter(
                        (r) => r.status === "Assessment-backed",
                      ).length
                    }
                    detail="Latest result meets the assessment target"
                  />
                  <Metric
                    label="Need stronger evidence"
                    value={missing.length}
                    detail="Unassessed claims, missing skills or below-target results"
                  />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Common names such as React and React.js are counted once.
                  Related but different skills stay separate. Self-declared
                  proficiency, project links and certificates do not
                  automatically pass an assessment requirement.
                </p>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Requirement-by-requirement evidence
                  </h2>
                  <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
                    {requirements.map((r) => (
                      <div
                        key={r.skill}
                        className="flex flex-wrap items-center justify-between gap-3 p-5"
                      >
                        <div>
                          <p className="text-sm font-semibold">{r.skill}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.evidence
                              ? "Latest assessment: " +
                                r.evidence.score +
                                "% / target " +
                                r.evidence.threshold +
                                "%"
                              : r.declared
                                ? "Listed in your profile; no industry assessment evidence yet."
                                : "Add evidence by taking a relevant published assessment."}
                          </p>
                        </div>
                        <Tag positive={r.status === "Assessment-backed"}>
                          {r.status}
                        </Tag>
                      </div>
                    ))}
                  </div>
                  {!requirements.length && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      The publisher has not listed required skills. No coverage
                      score can be calculated.
                    </p>
                  )}
                </div>
                <div className="grid items-start gap-5 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="font-display text-lg font-semibold">
                        1. Assess the requirements
                      </h2>
                      <DataState {...catalogue} retry={catalogue.refresh} />
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Employer-authored assessments attached to this
                        opportunity. Review the brief for competency coverage;
                        publication is not independent accreditation.
                      </p>
                      <div className="mt-4 space-y-3">
                        {assessments.map((a) => (
                          <Link
                            key={a.id}
                            href={"/student/industry-assessments/" + a.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm font-medium"
                          >
                            {a.title}
                            <ArrowRight className="h-4 w-4 shrink-0 role-text" />
                          </Link>
                        ))}
                        {!assessments.length &&
                          !catalogue.loading &&
                          !catalogue.error && (
                            <p className="text-sm text-muted-foreground">
                              No assessment is attached yet. An employer must
                              publish one before this gap can be assessed here.
                            </p>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="font-display text-lg font-semibold">
                        2. Find relevant learning
                      </h2>
                      <Link
                        href={"/student/learning-plan?target=" + target.id}
                        className="mt-3 inline-block text-sm font-semibold role-text"
                      >
                        Turn these gaps into a saved learning plan →
                      </Link>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Published programmes with skills overlapping your unmet
                        requirements. Attendance alone does not prove
                        competence.
                      </p>
                      <div className="mt-4 space-y-3">
                        {training.map((p) => (
                          <Link
                            key={p.id}
                            href={"/student/marketplace?opportunity=" + p.id}
                            className="block rounded-xl border border-border p-3"
                          >
                            <p className="text-sm font-medium">{p.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {p.company} ·{" "}
                              {p.skills
                                .filter((s) => missing.includes(skillKey(s)))
                                .join(", ")}
                            </p>
                          </Link>
                        ))}
                        {!training.length && (
                          <p className="text-sm text-muted-foreground">
                            No matching programme has been published. Review the
                            study resources in Skill Assessment; they are not a
                            substitute for employer evaluation.
                          </p>
                        )}
                      </div>
                      <Link
                        href="/student/assessment"
                        className="mt-4 inline-block text-xs font-semibold role-text"
                      >
                        Explore authored learning tracks →
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
            <SkillPassport data={data} />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
