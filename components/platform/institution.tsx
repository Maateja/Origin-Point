"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, Users, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CareerPreferenceSummary } from "./student-foundation";
import { uniqueSkills } from "@/lib/skill-taxonomy.mjs";
import { MemberLearningSummary } from "./learning-plan";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  exportRecords,
  reviewMembership,
  usePlatformData,
} from "@/lib/platform-store";
import {
  DataState,
  Empty,
  Metric,
  PageHeading,
  Tag,
  useAction,
} from "./primitives";
const titles: Record<string, string> = {
  students: "Know your cohort.",
  skills: "See where growth is needed.",
  placement: "Follow every placement journey.",
  recruitment: "Connect with active employers.",
  departments: "Bring departments into focus.",
};
export function InstitutionWorkspace({ view = "students" }: { view?: string }) {
  const state = usePlatformData();
  const data = state.data;
  const action = useAction();
  const [query, setQuery] = useState("");
  if (!data || state.error)
    return (
      <DashboardShell role="institution" title="Institution">
        <DataState {...state} retry={state.refresh} />
      </DashboardShell>
    );
  const requests = data.memberships.filter(
    (m) => m.institution_id === data.profile.id,
  );
  const memberIds = new Set(
    requests.filter((m) => m.status === "Approved").map((m) => m.member_id),
  );
  const members = data.directory.filter((p) => memberIds.has(p.id));
  const students = members.filter((p) => p.role === "student");
  const applications = data.applications.filter((a) =>
    students.some((p) => p.id === a.applicantId),
  );
  const placed = new Set(
    applications
      .filter(
        (a) =>
          ["Offered", "Completed"].includes(a.status) &&
          data.opportunities.find((o) => o.id === a.opportunityId)?.type ===
            "Job",
      )
      .map((a) => a.applicantId),
  );
  const reports = data.reports.filter(
    (r) => r.userId && memberIds.has(r.userId),
  );
  const avg = reports.length
    ? Math.round(
        reports.reduce((sum, r) => sum + r.scorePercent, 0) / reports.length,
      )
    : null;
  const departments = [
    ...new Set(members.map((p) => p.department || "Unassigned")),
  ];
  const demand = new Map<string, number>();
  data.opportunities.forEach((o) =>
    uniqueSkills(o.skills).forEach((s) =>
      demand.set(s, (demand.get(s) || 0) + 1),
    ),
  );
  const employers = data.directory.filter(
    (p) =>
      p.role === "industry" &&
      data.opportunities.some((o) => o.ownerId === p.id),
  );
  return (
    <DashboardShell
      role="institution"
      title={view.charAt(0).toUpperCase() + view.slice(1)}
    >
      <div className="space-y-6">
        <PageHeading
          eyebrow="Institution intelligence"
          title={titles[view] || titles.students}
          description="Analytics use approved members and their actual records. Members request access from their profiles, and you decide who joins your institution."
          action={
            <Button
              variant="outline"
              onClick={() =>
                exportRecords("institution-" + view + ".json", {
                  members,
                  applications,
                  reports,
                  departments,
                })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Export report
            </Button>
          }
        />
        {action.feedback}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Approved students" value={students.length} />
          <Metric
            label="Assessment average"
            value={avg === null ? "—" : avg + "%"}
            detail={reports.length + " completed assessments"}
          />
          <Metric
            label="Job offers received"
            value={placed.size}
            detail="Stage-based count; see Recruitment Tracker for written offers and confirmed joining"
          />
          <Metric
            label="Placement offer rate"
            value={
              students.length
                ? Math.round((placed.size / students.length) * 100) + "%"
                : "—"
            }
            detail="Students with job offers / approved students"
          />
        </div>
        {view === "students" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Membership requests</CardTitle>
                <CardDescription>
                  Approving shares the member’s portfolio, assessments, and
                  application progress with your institution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests
                  .filter((m) => m.status === "Pending")
                  .map((m) => {
                    const p = data.directory.find((p) => p.id === m.member_id);
                    return (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {p?.full_name || "Member"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p?.role} · {p?.program || p?.headline}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            disabled={action.busy}
                            variant="outline"
                            onClick={() =>
                              action.run(
                                () => reviewMembership(m.id, "Declined"),
                                "Request declined.",
                              )
                            }
                          >
                            Decline
                          </Button>
                          <Button
                            disabled={action.busy}
                            className="role-gradient border-0 text-white"
                            onClick={() =>
                              action.run(
                                () => reviewMembership(m.id, "Approved"),
                                "Member approved.",
                              )
                            }
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                {!requests.some((m) => m.status === "Pending") && (
                  <p className="text-sm text-muted-foreground">
                    No pending membership requests.
                  </p>
                )}
              </CardContent>
            </Card>
            <input
              aria-label="Search members"
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a member by name or department"
            />
            <div className="grid gap-4 md:grid-cols-2">
              {members
                .filter((p) =>
                  [p.full_name, p.department, p.program]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-5">
                      <div className="flex justify-between">
                        <h2 className="font-semibold">
                          {p.full_name || "Name not added"}
                        </h2>
                        <Tag>{p.role}</Tag>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {p.department || "Department not added"} ·{" "}
                        {p.program || "Program not added"}
                      </p>
                      <div className="mt-3">
                        <CareerPreferenceSummary profile={p} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.role === "student" && (
                          <MemberLearningSummary userId={p.id} />
                        )}
                        {p.skills.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">
                        {data.reports.filter((r) => r.userId === p.id).length}{" "}
                        assessments ·{" "}
                        {
                          applications.filter((a) => a.applicantId === p.id)
                            .length
                        }{" "}
                        applications
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}
        {view === "skills" && (
          <Card>
            <CardHeader>
              <CardTitle>Skill coverage vs. published demand</CardTitle>
              <CardDescription>
                Coverage is the percentage of approved students reporting each
                skill. Demand counts published opportunity requirements, not an
                external market estimate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[...demand]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([skill, count]) => {
                  const coverage = students.length
                    ? Math.round(
                        (students.filter((p) =>
                          p.skills.some(
                            (s) => s.toLowerCase() === skill.toLowerCase(),
                          ),
                        ).length /
                          students.length) *
                          100,
                      )
                    : 0;
                  return (
                    <div key={skill}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium">{skill}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} opportunities ·{" "}
                          {students.length
                            ? coverage + "% coverage"
                            : "No cohort yet"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full role-gradient"
                          style={{ width: coverage + "%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              {!demand.size && (
                <Empty
                  title="Demand appears with opportunities"
                  description="Publish or connect with an employer to begin mapping cohort skills against actual requirements."
                />
              )}
            </CardContent>
          </Card>
        )}
        {view === "departments" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((department) => {
              const people = members.filter(
                (p) => (p.department || "Unassigned") === department,
              );
              const assessments = reports.filter((r) =>
                people.some((p) => p.id === r.userId),
              );
              return (
                <Card key={department}>
                  <CardContent className="p-6">
                    <h2 className="font-display text-xl font-semibold">
                      {department}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {people.length} approved members
                    </p>
                    <p className="mt-5 text-3xl font-bold role-text">
                      {assessments.length
                        ? Math.round(
                            assessments.reduce(
                              (s, r) => s + r.scorePercent,
                              0,
                            ) / assessments.length,
                          ) + "%"
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Average across {assessments.length} assessments
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {view === "placement" && (
          <div className="space-y-3">
            {applications.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap justify-between gap-4 p-5">
                  <div>
                    <h2 className="font-semibold">{a.studentName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        data.opportunities.find((o) => o.id === a.opportunityId)
                          ?.title
                      }
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {a.nextStep}
                    </p>
                  </div>
                  <Tag positive={["Offered", "Completed"].includes(a.status)}>
                    {a.status}
                  </Tag>
                </CardContent>
              </Card>
            ))}
            {!applications.length && (
              <Empty
                title="No applications in this cohort yet"
                description="Placement activity appears when approved students apply to published opportunities."
              />
            )}
          </div>
        )}
        {view === "recruitment" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employers.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-6">
                  <h2 className="font-display text-xl font-semibold">
                    {p.organization || p.full_name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.headline || p.location}
                  </p>
                  <p className="mt-4 text-xs role-text">
                    {
                      data.opportunities.filter((o) => o.ownerId === p.id)
                        .length
                    }{" "}
                    published opportunities
                  </p>
                  {p.website && /^https?:\/\//.test(p.website) && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      Organization website
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!members.length &&
          ["students", "skills", "departments"].includes(view) && (
            <Empty
              title="Build your institution’s cohort"
              description="Ask students and faculty to select your institution in Profile & credentials. Approve their requests here to start tracking real progress."
            />
          )}
        {view === "recruitment" && !employers.length && (
          <Empty
            title="The employer network is growing"
            description="Organizations appear here after publishing their first opportunity."
          />
        )}
      </div>
    </DashboardShell>
  );
}
