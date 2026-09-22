import test from "node:test";
import assert from "node:assert/strict";
import { buildInstitutionAnalytics } from "../lib/institution-analytics.mjs";

function fixture() {
  return {
    now: "2026-09-22T10:00:00Z",
    platform: {
      profile: { id: "institution" },
      memberships: ["s1", "s2", "faculty"].map((member_id) => ({
        member_id,
        institution_id: "institution",
        status: "Approved",
      })),
      directory: [
        {
          id: "s1",
          full_name: "Student One",
          role: "student",
          department: "CSE",
          graduation_year: 2027,
        },
        {
          id: "s2",
          full_name: "Student Two",
          role: "student",
          department: "ECE",
        },
        {
          id: "faculty",
          full_name: "Faculty",
          role: "academician",
          department: "CSE",
        },
        { id: "outside", full_name: "Outside", role: "student" },
      ],
      opportunities: [
        { id: "job", type: "Job", title: "Engineer" },
        { id: "intern", type: "Internship", title: "Intern" },
      ],
      applications: [],
      evidence: [],
    },
    tracking: {
      events: [],
      arrangements: [],
      supervisors: [],
      milestones: [],
      logs: [],
      reports: [],
      reviews: [],
      completions: [],
    },
    recruitment: { interviews: [], offers: [] },
    learning: { enrollments: [], programs: [] },
  };
}
const value = (model, id) =>
  [...model.metrics, ...model.funnel, ...model.queues].find((m) => m.id === id)
    .value;
const application = (
  id,
  applicantId = "s1",
  opportunityId = "job",
  status = "Applied",
) => ({ id, applicantId, opportunityId, status });

test("institution analytics scopes approved memberships and filters; empty cohort has no rate", () => {
  const f = fixture();
  f.platform.memberships.push({
    member_id: "outside",
    institution_id: "other",
    status: "Approved",
  });
  assert.equal(value(buildInstitutionAnalytics(f), "members"), 2);
  assert.equal(
    value(
      buildInstitutionAnalytics({ ...f, filters: { role: "all" } }),
      "members",
    ),
    3,
  );
  assert.equal(
    value(
      buildInstitutionAnalytics({
        ...f,
        filters: { department: "CSE", year: "2027" },
      }),
      "members",
    ),
    1,
  );
  assert.equal(
    value(
      buildInstitutionAnalytics({ ...f, filters: { year: "Not provided" } }),
      "members",
    ),
    1,
  );
  f.platform.memberships[0].status = "Pending";
  assert.equal(value(buildInstitutionAnalytics(f), "members"), 1);
  const empty = buildInstitutionAnalytics({
    ...f,
    filters: { department: "unknown" },
  });
  assert.equal(empty.placementRate, null);
  assert.ok(empty.metrics.every((m) => m.value === 0));
});

test("skill gaps use latest canonical evidence; unassessed is not a failure", () => {
  const f = fixture();
  const evidence = (id, skill, score, created_at, user_id = "s1") => ({
    id,
    skill,
    score,
    created_at,
    user_id,
    threshold: 70,
    assessment_report_id: "report-" + id,
  });
  f.platform.evidence = [
    evidence("old", "JS", 20, "2026-09-20"),
    evidence("new", "JavaScript", 90, "2026-09-21"),
    evidence("foreign", "Python", 10, "2026-09-22", "outside"),
  ];
  const m = buildInstitutionAnalytics(f);
  assert.equal(m.skills.length, 1);
  assert.equal(m.skills[0].below, 0);
  assert.equal(m.skills[0].assessed, 1);
  assert.equal(m.skills[0].unassessed, 1);
  assert.equal(value(m, "assessed"), 1);
  assert.equal(m.skills[0].assessedRows[0].sourceId, "report-new");
});

test("written offers and two-party joining are separate from legacy application stages", () => {
  const f = fixture();
  f.platform.applications = [
    application("legacy", "s2", "job", "Completed"),
    application("a"),
    application("b"),
    application("c", "s2"),
    application("outside", "outside"),
    application("intern", "s2", "intern"),
  ];
  const offer = (
    id,
    response,
    employer_joined_at = null,
    applicant_joined_at = null,
  ) => ({
    id: "offer-" + id,
    application_id: id,
    response,
    employer_joined_at,
    applicant_joined_at,
    compensation: "PRIVATE",
  });
  f.recruitment.offers = [
    offer("a", "Accepted", "2026-09-21", "2026-09-21"),
    offer("b", "Accepted", "2026-09-21", "2026-09-21"),
    offer("c", "Accepted", "2026-09-21"),
    offer("outside", "Accepted", "2026-09-21", "2026-09-21"),
    offer("intern", "Accepted", "2026-09-21", "2026-09-21"),
  ];
  const m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "applications"), 4);
  assert.equal(value(m, "offers"), 3);
  assert.equal(value(m, "accepted"), 3);
  assert.equal(value(m, "joined"), 2);
  assert.equal(value(m, "placement-members"), 1);
  assert.equal(m.placementRate, 50);
  assert.ok(!JSON.stringify(m).includes("PRIVATE"));
  assert.ok(!JSON.stringify(m).includes("Outside"));
});

test("scheduled interview is not attendance and later stages do not invent shortlist history", () => {
  const f = fixture();
  f.platform.applications = [
    application("a", "s1", "job", "Offered"),
    application("b", "s2", "job", "Shortlisted"),
  ];
  f.recruitment.interviews = [
    { id: "i1", application_id: "a", status: "Cancelled" },
    { id: "i2", application_id: "b", status: "Scheduled" },
    { id: "i3", application_id: "b", status: "Scheduled" },
  ];
  let m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "interviews"), 1);
  assert.equal(value(m, "shortlisted"), 1);
  f.tracking.events.push({
    application_id: "a",
    event_type: "Recruitment update",
    status: "Shortlisted",
  });
  m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "shortlisted"), 2);
  assert.equal(value(m, "offers"), 0);
});

test("internship activity requires accepted reached start; only reviewed records count completion", () => {
  const f = fixture();
  f.platform.applications = [
    "active",
    "future",
    "pending",
    "legacy",
    "reviewed",
  ].map((id) =>
    application(
      id,
      "s1",
      "intern",
      ["legacy", "reviewed"].includes(id) ? "Completed" : "Offered",
    ),
  );
  f.tracking.arrangements = [
    { application_id: "active", response: "Accepted", start_on: "2026-09-20" },
    { application_id: "future", response: "Accepted", start_on: "2026-09-25" },
    { application_id: "pending", response: "Pending", start_on: "2026-09-20" },
  ];
  f.tracking.completions = [{ id: "completion", application_id: "reviewed" }];
  f.tracking.milestones = [
    { id: "m1", application_id: "active", status: "Pending" },
    { id: "m2", application_id: "active", status: "Pending" },
  ];
  f.tracking.logs = [{ milestone_id: "m1" }];
  const m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "internships-active"), 1);
  assert.equal(value(m, "internships-completed"), 1);
  assert.equal(value(m, "milestone-reviews"), 1);
});

test("report follow-up uses latest version and separates correction requests from missing reviews", () => {
  const f = fixture();
  f.platform.applications = [application("a", "s1", "intern", "Offered")];
  f.tracking.arrangements = [
    { application_id: "a", response: "Accepted", start_on: "2026-09-20" },
  ];
  f.tracking.supervisors = [
    { application_id: "a", kind: "Faculty", status: "Pending" },
  ];
  f.tracking.reports = [
    {
      id: "r1",
      application_id: "a",
      kind: "Final",
      created_at: "2026-09-21",
      document_path: "SECRET",
    },
    { id: "r2", application_id: "a", kind: "Final", created_at: "2026-09-22" },
  ];
  f.tracking.reviews = [
    {
      id: "v1",
      report_id: "r1",
      review_role: "Industry",
      decision: "Approved",
      created_at: "2026-09-21",
    },
    {
      id: "v2",
      report_id: "r2",
      review_role: "Industry",
      decision: "Changes requested",
      created_at: "2026-09-22",
    },
  ];
  const m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "report-reviews"), 1);
  assert.equal(value(m, "report-corrections"), 1);
  assert.equal(m.queues[0].rows[0].sourceId, "r2");
  assert.ok(!JSON.stringify(m).includes("SECRET"));
});

test("learning counts saved enrollments and completions, not withdrawals or outsider activity", () => {
  const f = fixture();
  f.learning.enrollments = [
    { id: "e1", learner_id: "s1", status: "Enrolled" },
    { id: "e2", learner_id: "s2", status: "Completed" },
    { id: "e3", learner_id: "s1", status: "Withdrawn" },
    { id: "e4", learner_id: "outside", status: "Completed" },
  ];
  const m = buildInstitutionAnalytics(f);
  assert.equal(value(m, "learning-active"), 1);
  assert.equal(value(m, "learning-completed"), 1);
  assert.equal(value(m, "assessed"), 0);
});
