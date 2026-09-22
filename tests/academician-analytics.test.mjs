import test from "node:test";
import assert from "node:assert/strict";
import { buildAcademicianAnalytics } from "../lib/academician-analytics.mjs";
function fixture() {
  return {
    now: "2026-09-22T10:00:00Z",
    platform: {
      profile: { id: "faculty" },
      applications: [],
      opportunities: [
        {
          id: "intern",
          title: "Faculty internship",
          type: "Faculty Internship",
        },
      ],
    },
    tracking: { arrangements: [], completions: [] },
    learning: { programs: [], enrollments: [] },
    collaborations: { proposals: [] },
    supervision: [],
  };
}
const count = (m, id) =>
  [...m.metrics, ...m.queues].find((m) => m.id === id).value;
test("faculty dashboard keeps supervised student activity out of personal metrics", () => {
  const f = fixture();
  f.platform.applications = [
    {
      id: "a",
      applicantId: "faculty",
      opportunityId: "intern",
      status: "Offered",
    },
    {
      id: "b",
      applicantId: "student",
      opportunityId: "intern",
      status: "Offered",
    },
  ];
  f.tracking.arrangements = ["a", "b"].map((application_id) => ({
    application_id,
    response: "Accepted",
    start_on: "2026-09-21",
  }));
  const m = buildAcademicianAnalytics(f);
  assert.equal(count(m, "applications"), 1);
  assert.equal(count(m, "internships"), 1);
  f.tracking.arrangements[0].start_on = "2026-09-23";
  assert.equal(count(buildAcademicianAnalytics(f), "internships"), 0);
  f.tracking.arrangements[0].start_on = "2026-09-21";
  f.tracking.arrangements[0].response = "Pending";
  assert.equal(count(buildAcademicianAnalytics(f), "internships"), 0);
});
test("completion requires own saved reviewed record; enrollment is not assessment proficiency", () => {
  const f = fixture();
  f.platform.applications = [
    {
      id: "a",
      applicantId: "faculty",
      opportunityId: "intern",
      status: "Completed",
    },
  ];
  assert.equal(count(buildAcademicianAnalytics(f), "completions"), 0);
  f.tracking.completions = [
    { id: "c", application_id: "a", applicant_id: "faculty" },
    { id: "foreign", application_id: "a", applicant_id: "student" },
  ];
  f.learning.enrollments = [
    { id: "e", learner_id: "faculty", status: "Enrolled" },
    { id: "c", learner_id: "faculty", status: "Completed" },
    { id: "w", learner_id: "faculty", status: "Withdrawn" },
    { id: "s", learner_id: "student", status: "Completed" },
  ];
  const m = buildAcademicianAnalytics(f);
  assert.equal(count(m, "completions"), 1);
  assert.equal(count(m, "learning"), 1);
  assert.equal(count(m, "learning-completed"), 1);
});
test("supervision separates invitations, accessible assignments and lost access", () => {
  const f = fixture();
  f.supervision = [
    {
      id: "p",
      kind: "Faculty",
      status: "Pending",
      application_status: "Offered",
    },
    { id: "a", kind: "Faculty", status: "Accepted", can_access: true },
    { id: "l", kind: "Faculty", status: "Accepted", can_access: false },
    { id: "d", kind: "Faculty", status: "Declined" },
    { id: "m", kind: "Mentor", status: "Accepted", can_access: true },
    {
      id: "old",
      kind: "Faculty",
      status: "Pending",
      application_status: "Completed",
    },
  ];
  const m = buildAcademicianAnalytics(f);
  assert.equal(count(m, "supervision"), 1);
  assert.equal(count(m, "invitations"), 1);
  assert.equal(count(m, "access"), 1);
});
test("collaboration actions belong to the owner and unrelated proposals stay excluded", () => {
  const f = fixture();
  f.collaborations.proposals = [
    {
      id: "incoming",
      owner_id: "faculty",
      proposer_id: "other",
      status: "Submitted",
    },
    {
      id: "outgoing",
      owner_id: "industry",
      proposer_id: "faculty",
      status: "Submitted",
    },
    {
      id: "review",
      owner_id: "faculty",
      proposer_id: "other",
      status: "Accepted",
      completion_requested_at: "2026-09-22",
    },
    {
      id: "waiting",
      owner_id: "industry",
      proposer_id: "faculty",
      status: "Accepted",
      completion_requested_at: "2026-09-22",
    },
    {
      id: "foreign",
      owner_id: "industry",
      proposer_id: "stranger",
      status: "Accepted",
      title: "SECRET",
    },
    {
      id: "done",
      owner_id: "industry",
      proposer_id: "faculty",
      status: "Completed",
      completed_at: "2026-09-22",
    },
  ];
  const m = buildAcademicianAnalytics(f);
  assert.equal(count(m, "proposals"), 1);
  assert.equal(count(m, "completion-review"), 1);
  assert.equal(count(m, "collaborations"), 2);
  assert.equal(count(m, "collaborations-completed"), 1);
  assert.ok(!JSON.stringify(m).includes("SECRET"));
});
test("new faculty account displays zeros without invented activity", () => {
  const m = buildAcademicianAnalytics(fixture());
  assert.ok(
    [...m.metrics, ...m.queues].every(
      (m) => m.value === 0 && m.rows.length === 0,
    ),
  );
});
