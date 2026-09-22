"use client";
import Link from "next/link";
import { StudentSetupChecklist } from "@/components/platform/student-foundation";
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Target,
  GraduationCap,
  FileText,
  ShieldCheck,
  ChartColumn,
  Flag,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  usePlatformData,
  ownSkills,
  getMatchScore,
  isOpportunityOpen,
} from "@/lib/platform-store";
import {
  DataState,
  Empty,
  Metric,
  PageHeading,
  Tag,
} from "@/components/platform/primitives";
const copy = {
  student: {
    title: "Your next chapter starts here.",
    description: "Connect what you know with what you want to do next.",
    primary: "Explore opportunities",
    href: "/student/marketplace",
  },
  industry: {
    title: "Build your next team with confidence.",
    description:
      "Your published opportunities and applicant activity, in one place.",
    primary: "Publish opportunity",
    href: "/industry/post",
  },
  academician: {
    title: "Let your expertise travel further.",
    description:
      "Discover faculty development, research, and industry collaboration.",
    primary: "Explore faculty programs",
    href: "/academician/fdps",
  },
  institution: {
    title: "A clearer view of student progress.",
    description:
      "Make informed decisions with your approved cohort’s actual activity.",
    primary: "Manage your cohort",
    href: "/institution/students",
  },
};
export function RoleOverview({ role = "student" }) {
  const state = usePlatformData();
  const data = state.data;
  const c = copy[role] || copy.student;
  if (!data || state.error)
    return <DataState {...state} retry={state.refresh} />;
  const profileId = data?.profile?.id;
  const mine = (data?.applications ?? []).filter(
    (a) => a.applicantId === profileId,
  );
  const published = (data?.opportunities ?? []).filter(
    (o) => o.ownerId === profileId,
  );
  const received = (data?.applications ?? []).filter((a) =>
    published.some((o) => o.id === a.opportunityId),
  );
  const reports = (data?.reports ?? []).filter((r) => r.userId === profileId);
  const members = (data?.memberships ?? []).filter(
    (m) => m.institution_id === profileId && m.status === "Approved",
  );
  const skills = ownSkills(data);
  const matches = (data?.opportunities ?? [])
    .filter(
      (o) =>
        isOpportunityOpen(o) && (o.audience === role || o.audience === "all"),
    )
    .sort(
      (a, b) =>
        getMatchScore(b.skills, skills) - getMatchScore(a.skills, skills),
    )
    .slice(0, 4);
  const credentials = (data?.records ?? []).filter(
    (r) => r.user_id === profileId && r.kind === "certification",
  );
  const metrics =
    role === "institution"
      ? [
          ["Approved members", members.length],
          [
            "Pending requests",
            (data?.memberships ?? []).filter(
              (m) => m.institution_id === profileId && m.status === "Pending",
            ).length,
          ],
          [
            "Cohort applications",
            (data?.applications ?? []).filter((a) =>
              members.some((m) => m.member_id === a.applicantId),
            ).length,
          ],
          ["Published collaborations", published.length],
        ]
      : role === "industry"
        ? [
            ["Open opportunities", published.filter(isOpportunityOpen).length],
            ["Applications received", received.length],
            [
              "Shortlisted",
              received.filter((a) => a.status === "Shortlisted").length,
            ],
            [
              "Offers made",
              received.filter((a) =>
                ["Offered", "Completed"].includes(a.status),
              ).length,
            ],
          ]
        : [
            ["Skills in your profile", skills.length],
            ["Applications", mine.length],
            ["Certifications", credentials.length],
            ["Assessments completed", reports.length],
          ];
  const steps = [
    {
      title: "Complete your profile",
      description: "Add your organization, interests, and skills.",
      href: "/" + role + "/profile",
    },
    role === "student"
      ? {
          title: "Understand your strengths",
          description: "Take an assessment and review your results.",
          href: "/student/assessment",
        }
      : {
          title: "Publish a collaboration",
          description: "Create a brief for work or learning.",
          href:
            role === "industry" ? "/industry/post" : "/" + role + "/publish",
        },
    {
      title:
        role === "institution"
          ? "Review membership requests"
          : "Follow application progress",
      description:
        role === "institution"
          ? "Connect your students and faculty."
          : "Keep every next step visible.",
      href:
        role === "industry"
          ? "/industry/candidates"
          : role === "institution"
            ? "/institution/students"
            : "/" + role + "/applications",
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={
          data.profile.full_name
            ? "Welcome, " + data.profile.full_name
            : "Welcome to Origin Point"
        }
        title={c.title}
        description={c.description}
        action={
          <Link href={c.href}>
            <Button className="role-gradient border-0 text-white">
              {c.primary}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value], index) => {
          const Icon = [GraduationCap, FileText, ShieldCheck, ChartColumn][
            index
          ];
          return (
            <Metric
              key={label}
              label={label}
              value={value}
              icon={<Icon className="h-6 w-6" />}
            />
          );
        })}
      </div>
      {role === "student" && <StudentSetupChecklist data={data} />}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <Target
                aria-hidden="true"
                className="mr-3 inline-block h-6 w-6 text-muted-foreground"
              />
              {["student", "academician"].includes(role)
                ? "Opportunities for you"
                : "Recent activity"}
            </CardTitle>
            <CardDescription>
              {["student", "academician"].includes(role)
                ? "Published opportunities matched against your saved skills."
                : "Recorded activity in your workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["student", "academician"].includes(role)
              ? matches.map((o) => (
                  <Link
                    key={o.id}
                    href={
                      role === "student"
                        ? "/student/marketplace"
                        : [
                              "FDP",
                              "Training",
                              "Workshop",
                              "Mentorship",
                            ].includes(o.type)
                          ? "/academician/fdps"
                          : ["Research", "Live Project"].includes(o.type)
                            ? "/academician/research"
                            : o.type === "Consultancy"
                              ? "/academician/consultancy"
                              : "/academician/internships"
                    }
                    className="glass-row flex items-center justify-between gap-4 rounded-2xl p-4"
                  >
                    <div
                      className="glass-icon-tile hidden sm:flex"
                      aria-hidden="true"
                    >
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{o.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.company} · {o.location}
                      </p>
                      <div className="mt-2">
                        <Tag>{o.type}</Tag>
                      </div>
                    </div>
                    <span className="text-sm font-bold role-text">
                      {getMatchScore(o.skills, skills)}%
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  </Link>
                ))
              : data.applications.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="glass-row flex items-center justify-between gap-4 rounded-2xl p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{a.studentName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          data.opportunities.find(
                            (o) => o.id === a.opportunityId,
                          )?.title
                        }
                      </p>
                    </div>
                    <Tag>{a.status}</Tag>
                  </div>
                ))}
            {(["student", "academician"].includes(role)
              ? !matches.length
              : !data.applications.length) && (
              <Empty
                title="Ready for your first milestone"
                description="As you build your profile and connect with others, your real activity will appear here."
              />
            )}
          </CardContent>
        </Card>
        <Card className="role-gradient-subtle">
          <CardHeader>
            <CardTitle>
              <Flag
                aria-hidden="true"
                className="mr-3 inline-block h-6 w-6 text-muted-foreground"
              />
              Your next steps
            </CardTitle>
            <CardDescription>A few useful places to begin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s, i) => (
              <Link
                href={s.href}
                key={s.title}
                className="glass-row flex items-start gap-3 rounded-2xl p-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full role-bg-soft text-xs font-bold role-text">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
