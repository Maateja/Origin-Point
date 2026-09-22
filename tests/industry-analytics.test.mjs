import test from "node:test";
import assert from "node:assert/strict";
import { buildIndustryAnalytics } from "../lib/industry-analytics.mjs";
function fixture() {
  return {
    now: "2026-09-22T10:00:00Z",
    platform: {
      profile: { id: "employer" },
      opportunities: [
        { id: "job", ownerId: "employer", type: "Job", title: "Engineer" },
        {
          id: "intern",
          ownerId: "employer",
          type: "Internship",
          title: "Intern",
        },
        { id: "other", ownerId: "outsider", type: "Job", title: "Other" },
      ],
      applications: [
        {
          id: "a",
          opportunityId: "job",
          studentName: "One",
          status: "Applied",
        },
        {
          id: "b",
          opportunityId: "intern",
          studentName: "Two",
          status: "Shortlisted",
        },
        {
          id: "c",
          opportunityId: "other",
          studentName: "Private",
          status: "Applied",
        },
      ],
    },
    recruitment: { offers: [], interviews: [] },
  };
}
const count = (m, id) =>
  [...m.metrics, ...m.queues].find((x) => x.id === id).value;
test("employer analytics scopes ownership and rejects foreign opportunity filters", () => {
  const f = fixture();
  const m = buildIndustryAnalytics(f);
  assert.equal(count(m, "applications"), 2);
  assert.equal(count(m, "review"), 1);
  assert.ok(!JSON.stringify(m).includes("Private"));
  assert.equal(
    count(
      buildIndustryAnalytics({ ...f, opportunityId: "intern" }),
      "applications",
    ),
    1,
  );
  assert.equal(
    count(
      buildIndustryAnalytics({ ...f, opportunityId: "other" }),
      "applications",
    ),
    0,
  );
});
test("written offers exclude legacy stages and non-job offers; joining requires both parties", () => {
  const f = fixture();
  f.platform.applications[0].status = "Completed";
  assert.equal(count(buildIndustryAnalytics(f), "offers"), 0);
  f.recruitment.offers = [
    {
      id: "o",
      application_id: "a",
      response: "Accepted",
      employer_joined_at: "2026-09-22",
      compensation: "SECRET",
    },
    {
      id: "i",
      application_id: "b",
      response: "Accepted",
      employer_joined_at: "date",
      applicant_joined_at: "date",
    },
    { id: "foreign", application_id: "c", response: "Accepted" },
  ];
  let m = buildIndustryAnalytics(f);
  assert.equal(count(m, "offers"), 1);
  assert.equal(count(m, "joined"), 0);
  assert.equal(count(m, "joining-followup"), 1);
  assert.ok(!JSON.stringify(m).includes("SECRET"));
  f.recruitment.offers[0].applicant_joined_at = "2026-09-22";
  m = buildIndustryAnalytics(f);
  assert.equal(count(m, "joined"), 1);
  assert.equal(count(m, "joining-followup"), 0);
  f.recruitment.offers[0].response = "Withdrawn";
  assert.equal(count(buildIndustryAnalytics(f), "joined"), 0);
});
test("pending versus expired offers respect timestamps and explicit response", () => {
  const f = fixture();
  f.recruitment.offers = [
    {
      id: "o",
      application_id: "a",
      response: "Pending",
      expires_at: "2026-09-22T15:30:00+05:30",
    },
  ];
  assert.equal(count(buildIndustryAnalytics(f), "expired-offers"), 1);
  f.recruitment.offers[0].expires_at = "2026-09-22T15:31:00+05:30";
  assert.equal(count(buildIndustryAnalytics(f), "pending-offers"), 1);
  f.recruitment.offers[0].response = "Declined";
  assert.equal(count(buildIndustryAnalytics(f), "pending-offers"), 0);
});
test("upcoming interviews exclude cancelled, past, foreign and no-longer-eligible applications", () => {
  const f = fixture();
  f.recruitment.interviews = [
    {
      id: "upcoming",
      application_id: "b",
      status: "Scheduled",
      starts_at: "2026-09-23T10:00:00Z",
      response: "Reschedule requested",
    },
    {
      id: "past",
      application_id: "b",
      status: "Scheduled",
      starts_at: "2026-09-21T10:00:00Z",
    },
    {
      id: "cancelled",
      application_id: "b",
      status: "Cancelled",
      starts_at: "2026-09-23T10:00:00Z",
    },
    {
      id: "foreign",
      application_id: "c",
      status: "Scheduled",
      starts_at: "2026-09-23T10:00:00Z",
    },
  ];
  let m = buildIndustryAnalytics(f);
  assert.equal(count(m, "interviews"), 1);
  assert.equal(count(m, "reschedule"), 1);
  f.platform.applications[1].status = "Offered";
  m = buildIndustryAnalytics(f);
  assert.equal(count(m, "interviews"), 0);
});
test("empty employer has honest zero metrics and no candidate records", () => {
  const f = fixture();
  f.platform.profile.id = "new-employer";
  const m = buildIndustryAnalytics(f);
  assert.ok(
    [...m.metrics, ...m.queues].every(
      (v) => v.value === 0 && v.rows.length === 0,
    ),
  );
  assert.deepEqual(m.options, []);
});
