/** Read-only employer snapshot. APIs enforce RLS; ownership is narrowed again here. @param {any} input */
export function buildIndustryAnalytics({
  platform,
  recruitment,
  opportunityId = "",
  now = new Date().toISOString(),
}) {
  const owned = platform.opportunities.filter(
    (o) => o.ownerId === platform.profile.id,
  );
  const opportunities = owned.filter(
    (o) => !opportunityId || o.id === opportunityId,
  );
  const ids = new Set(opportunities.map((o) => o.id));
  const apps = platform.applications.filter((a) => ids.has(a.opportunityId));
  const byId = new Map(apps.map((a) => [a.id, a]));
  const jobs = new Set(
    opportunities.filter((o) => o.type === "Job").map((o) => o.id),
  );
  const instant = new Date(now).getTime();
  const row = (a, detail = a.status) => ({
    id: a.id,
    applicationId: a.id,
    name: a.studentName || "Name not provided",
    title:
      opportunities.find((o) => o.id === a.opportunityId)?.title ||
      "Opportunity unavailable",
    detail,
    href: [
      "Shortlisted",
      "Interview Scheduled",
      "Offered",
      "Completed",
    ].includes(a.status)
      ? "/industry/recruitment-tracker"
      : "/industry/candidates",
  });
  const metric = (id, label, definition, rows) => ({
    id,
    label,
    definition,
    value: rows.length,
    rows,
  });
  const offers = recruitment.offers.filter(
    (o) =>
      byId.has(o.application_id) &&
      jobs.has(byId.get(o.application_id).opportunityId),
  );
  const offerRows = (list) =>
    list.map((o) => ({
      ...row(
        byId.get(o.application_id),
        `${o.response} · proposed joining ${o.joining_on}`,
      ),
      id: o.id,
    }));
  const accepted = offers.filter((o) => o.response === "Accepted");
  const joined = accepted.filter(
    (o) => o.employer_joined_at && o.applicant_joined_at,
  );
  const interviews = recruitment.interviews.filter(
    (i) =>
      byId.has(i.application_id) &&
      i.status === "Scheduled" &&
      ["Shortlisted", "Interview Scheduled"].includes(
        byId.get(i.application_id).status,
      ),
  );
  const upcoming = interviews
    .filter((i) => new Date(i.starts_at).getTime() >= instant)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const interviewRows = (list) =>
    list.map((i) => ({
      ...row(
        byId.get(i.application_id),
        `${i.starts_at} · ${i.mode} · ${i.response}`,
      ),
      id: i.id,
    }));
  return {
    generatedAt: now,
    opportunityId,
    options: owned.map((o) => ({ id: o.id, title: o.title, type: o.type })),
    metrics: [
      metric(
        "applications",
        "Applications received",
        "Applications to your selected opportunities. Counts applications, not unique candidates.",
        apps.map((a) => row(a)),
      ),
      metric(
        "review",
        "Awaiting initial review",
        "Applications currently in Applied stage. No automated rejection or shortlist is performed.",
        apps.filter((a) => a.status === "Applied").map((a) => row(a)),
      ),
      metric(
        "shortlisted",
        "Currently shortlisted",
        "Current Shortlisted applications, not a reconstruction of historical transitions.",
        apps.filter((a) => a.status === "Shortlisted").map((a) => row(a)),
      ),
      metric(
        "interviews",
        "Upcoming interview schedules",
        "Non-cancelled schedules at or after this snapshot for applications still in an interview-eligible stage. Scheduling is not attendance.",
        interviewRows(upcoming),
      ),
      metric(
        "offers",
        "Written job offers",
        "Actual saved Job offers, including declined, withdrawn and expired offers. Recruitment status alone does not count.",
        offerRows(offers),
      ),
      metric(
        "accepted",
        "Accepted job offers",
        "Explicit applicant acceptance; this does not establish joining.",
        offerRows(accepted),
      ),
      metric(
        "joined",
        "Two-party confirmed joinings",
        "Accepted Job offers with both employer and applicant joining timestamps. Counts offers, not unique people.",
        offerRows(joined),
      ),
    ],
    queues: [
      metric(
        "reschedule",
        "Rescheduling requested",
        "Upcoming active interview schedules with an applicant request to reschedule.",
        interviewRows(
          upcoming.filter((i) => i.response === "Reschedule requested"),
        ),
      ),
      metric(
        "pending-offers",
        "Awaiting offer response",
        "Pending written offers whose response deadline has not passed.",
        offerRows(
          offers.filter(
            (o) =>
              o.response === "Pending" &&
              new Date(o.expires_at).getTime() > instant,
          ),
        ),
      ),
      metric(
        "expired-offers",
        "Offer deadlines passed",
        "Pending written offers whose response deadline has passed. No response or rejection is inferred.",
        offerRows(
          offers.filter(
            (o) =>
              o.response === "Pending" &&
              new Date(o.expires_at).getTime() <= instant,
          ),
        ),
      ),
      metric(
        "joining-followup",
        "Joining confirmation outstanding",
        "Accepted Job offers missing at least one joining confirmation. May include future proposed joining dates; not an overdue count.",
        offerRows(
          accepted.filter(
            (o) => !o.employer_joined_at || !o.applicant_joined_at,
          ),
        ),
      ),
    ],
  };
}
