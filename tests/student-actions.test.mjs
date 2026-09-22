import test from "node:test";
import assert from "node:assert/strict";
import { buildStudentActions } from "../lib/student-actions.mjs";
function fixture() {
  return {
    now: "2026-09-22T10:00:00Z",
    platform: {
      profile: { id: "me", full_name: "Student", department: "CSE" },
      records: [{ user_id: "me", kind: "skill", title: "JavaScript" }],
      applications: [
        { id: "a", applicantId: "me", status: "Interview Scheduled" },
      ],
      opportunities: [],
      evidence: [],
    },
    tracking: {
      reports: [],
      reviews: [],
      milestones: [],
      logs: [],
      completions: [],
    },
    recruitment: { interviews: [], offers: [] },
    learning: { enrollments: [], programs: [] },
    goals: [],
  };
}
test("student actions scope records and prioritize live offers over upcoming interviews", () => {
  const f = fixture();
  f.recruitment.offers = [
    {
      id: "o",
      application_id: "a",
      response: "Pending",
      expires_at: "2026-09-23",
    },
    {
      id: "expired",
      application_id: "a",
      response: "Pending",
      expires_at: "2026-09-21",
    },
    {
      id: "foreign",
      application_id: "other",
      response: "Pending",
      expires_at: "2026-09-23",
    },
  ];
  f.recruitment.interviews = [
    {
      id: "i",
      application_id: "a",
      status: "Scheduled",
      starts_at: "2026-09-22T12:00:00Z",
    },
    {
      id: "cancelled",
      application_id: "a",
      status: "Cancelled",
      starts_at: "2026-09-23",
    },
    {
      id: "past",
      application_id: "a",
      status: "Scheduled",
      starts_at: "2026-09-21",
    },
  ];
  assert.deepEqual(
    buildStudentActions(f).actions.map((a) => a.id),
    ["offer:o", "interview:i"],
  );
});
test("match coverage uses latest evidence and real open published learning only", () => {
  const f = fixture();
  const o = (id, type, skills) => ({
    id,
    title: id,
    company: "Publisher",
    type,
    skills,
    status: "Open",
    audience: "student",
    deadline: "2026-09-23",
  });
  f.platform.opportunities = [
    o("job", "Job", ["JS", "Python"]),
    o("course", "Training", ["Python"]),
    { ...o("closed", "Training", ["Python"]), status: "Closed" },
  ];
  f.platform.evidence = [
    {
      id: "old",
      user_id: "me",
      skill: "JavaScript",
      score: 20,
      threshold: 60,
      created_at: "2026-09-20",
    },
    {
      id: "new",
      user_id: "me",
      skill: "JS",
      score: 80,
      threshold: 60,
      created_at: "2026-09-21",
    },
    {
      id: "foreign",
      user_id: "other",
      skill: "Python",
      score: 100,
      threshold: 60,
      created_at: "2026-09-22",
    },
  ];
  f.learning.programs = [
    {
      id: "course",
      opportunity: { title: "Python course", skills: ["Python"] },
    },
    {
      id: "closed",
      opportunity: { title: "Closed course", skills: ["Python"] },
    },
  ];
  const m = buildStudentActions(f).matches[0];
  assert.equal(m.backed, 1);
  assert.equal(m.total, 2);
  assert.equal(m.skills[1].status, "No evidence");
  assert.deepEqual(
    m.programs.map((p) => p.id),
    ["course"],
  );
});
test("no evidence is not a failed assessment and completed learning grants no proficiency", () => {
  const f = fixture();
  f.platform.opportunities = [
    {
      id: "j",
      title: "Role",
      type: "Job",
      skills: ["JavaScript"],
      status: "Open",
      audience: "all",
      deadline: "2026-09-22",
    },
  ];
  f.learning.enrollments = [
    { id: "e", learner_id: "me", status: "Completed", program_id: "p" },
  ];
  const m = buildStudentActions(f);
  assert.equal(m.matches[0].skills[0].status, "Self-declared");
  assert.equal(m.matches[0].backed, 0);
  assert.ok(m.actions.some((a) => a.id === "reassess:e"));
  assert.equal(m.summary.learningCompleted, 1);
});
test("latest report version and latest role review determine correction actions", () => {
  const f = fixture();
  f.platform.applications[0].status = "Offered";
  f.tracking.reports = [
    { id: "old", application_id: "a", kind: "Final", created_at: "2026-09-20" },
    { id: "new", application_id: "a", kind: "Final", created_at: "2026-09-21" },
  ];
  f.tracking.reviews = [
    {
      id: "r1",
      report_id: "old",
      review_role: "Industry",
      decision: "Changes requested",
      created_at: "2026-09-21",
    },
  ];
  assert.equal(buildStudentActions(f).actions.length, 0);
  f.tracking.reviews.push({
    id: "r2",
    report_id: "new",
    review_role: "Industry",
    decision: "Changes requested",
    created_at: "2026-09-22",
  });
  assert.equal(buildStudentActions(f).actions[0].id, "report:new");
  f.tracking.reviews.push({
    id: "r3",
    report_id: "new",
    review_role: "Industry",
    decision: "Approved",
    created_at: "2026-09-23",
  });
  assert.equal(buildStudentActions(f).actions.length, 0);
});
test("expired and faculty-only opportunities never enter student matches", () => {
  const f = fixture();
  f.platform.opportunities = [
    {
      id: "expired",
      title: "Expired",
      type: "Job",
      skills: [],
      status: "Open",
      audience: "student",
      deadline: "2026-09-21",
    },
    {
      id: "faculty",
      title: "Faculty",
      type: "Job",
      skills: [],
      status: "Open",
      audience: "academician",
      deadline: "2026-09-25",
    },
  ];
  assert.deepEqual(buildStudentActions(f).matches, []);
});
