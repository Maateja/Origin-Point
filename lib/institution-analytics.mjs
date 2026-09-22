import { skillKey, skillName } from "./skill-taxonomy.mjs";

const internshipTypes = new Set([
  "Internship",
  "Apprenticeship",
  "Live Project",
  "Faculty Internship",
]);
const latestFirst = (a, b) =>
  String(b.created_at).localeCompare(String(a.created_at)) ||
  String(a.id).localeCompare(String(b.id));
const latestRecordFirst = (a, b) =>
  new Date(b.created_at) - new Date(a.created_at) ||
  String(b.id).localeCompare(String(a.id));
const department = (p) => p.department?.trim() || "Unassigned";
const year = (p) =>
  p.graduation_year == null ? "Not provided" : String(p.graduation_year);
/** Derive only from approved institution members; all sources must be loaded by the caller. @param {any} input */
export function buildInstitutionAnalytics({
  platform,
  tracking,
  recruitment,
  learning,
  filters = {},
  now = new Date().toISOString(),
}) {
  filters = { role: "student", ...filters };
  const approvedIds = new Set(
    platform.memberships
      .filter(
        (m) =>
          m.institution_id === platform.profile.id && m.status === "Approved",
      )
      .map((m) => m.member_id),
  );
  const approved = platform.directory.filter(
    (p) => approvedIds.has(p.id) && ["student", "academician"].includes(p.role),
  );
  const members = approved.filter(
    (p) =>
      (!filters.role || filters.role === "all" || p.role === filters.role) &&
      (!filters.department || department(p) === filters.department) &&
      (!filters.year || year(p) === filters.year),
  );
  const ids = new Set(members.map((p) => p.id));
  const people = new Map(members.map((p) => [p.id, p]));
  const opportunities = new Map(platform.opportunities.map((o) => [o.id, o]));
  const applications = platform.applications.filter((a) =>
    ids.has(a.applicantId),
  );
  const appMap = new Map(applications.map((a) => [a.id, a]));
  const jobApps = applications.filter(
    (a) => opportunities.get(a.opportunityId)?.type === "Job",
  );
  const jobIds = new Set(jobApps.map((a) => a.id));
  const internshipApps = applications.filter((a) =>
    internshipTypes.has(opportunities.get(a.opportunityId)?.type),
  );
  const internshipIds = new Set(internshipApps.map((a) => a.id));
  const today = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const personRow = (p) => ({
    id: p.id,
    personId: p.id,
    name: p.full_name || "Name not provided",
    title: p.program || p.role,
    detail: `${department(p)} · Graduation: ${year(p)}`,
    sourceId: p.id,
    href: "/institution/students",
  });
  const appRow = (a, detail = a.status) => ({
    id: a.id,
    personId: a.applicantId,
    name: people.get(a.applicantId)?.full_name || "Name not provided",
    title:
      opportunities.get(a.opportunityId)?.title || "Opportunity unavailable",
    detail,
    sourceId: a.id,
    href: internshipIds.has(a.id)
      ? "/institution/internships"
      : "/institution/recruitment-tracker",
  });
  const metric = (id, label, definition, rows) => ({
    id,
    label,
    definition,
    value: rows.length,
    rows,
  });
  const latestEvidence = new Map();
  for (const e of platform.evidence
    .filter((e) => ids.has(e.user_id))
    .sort(latestFirst)) {
    const key = e.user_id + ":" + skillKey(e.skill);
    if (!latestEvidence.has(key)) latestEvidence.set(key, e);
  }
  const evidence = [...latestEvidence.values()];
  const evidenceRow = (e) => ({
    id: e.id,
    personId: e.user_id,
    name: people.get(e.user_id)?.full_name || "Name not provided",
    title: skillName(e.skill),
    detail: `${e.score}% · issuer target ${e.threshold}% · assessed ${e.created_at}`,
    sourceId: e.assessment_report_id,
    href: "/institution/skills",
  });
  const skillGroups = new Map();
  for (const e of evidence) {
    const k = skillKey(e.skill);
    if (!skillGroups.has(k)) skillGroups.set(k, []);
    skillGroups.get(k).push(e);
  }
  const skills = [...skillGroups]
    .map(([key, list]) => {
      const gaps = list.filter((e) => e.score < e.threshold);
      const assessedIds = new Set(list.map((e) => e.user_id));
      return {
        id: key,
        label: skillName(list[0].skill),
        assessed: list.length,
        below: gaps.length,
        met: list.length - gaps.length,
        unassessed: members.length - list.length,
        rows: gaps.map(evidenceRow),
        assessedRows: list.map(evidenceRow),
        unassessedRows: members
          .filter((p) => !assessedIds.has(p.id))
          .map(personRow),
      };
    })
    .sort((a, b) => b.below - a.below || a.label.localeCompare(b.label));
  const offers = recruitment.offers.filter((o) => jobIds.has(o.application_id));
  const joined = offers.filter(
    (o) =>
      o.response === "Accepted" &&
      o.employer_joined_at &&
      o.applicant_joined_at,
  );
  const joinedIds = new Set(
    joined.map((o) => appMap.get(o.application_id).applicantId),
  );
  const interviews = recruitment.interviews.filter(
    (i) => jobIds.has(i.application_id) && i.status === "Scheduled",
  );
  const interviewIds = new Set(interviews.map((i) => i.application_id));
  const shortlistedIds = new Set(
    tracking.events
      .filter(
        (e) =>
          jobIds.has(e.application_id) &&
          e.event_type === "Recruitment update" &&
          e.status === "Shortlisted",
      )
      .map((e) => e.application_id),
  );
  const funnel = [
    metric(
      "applications",
      "Applied",
      "All saved Job applications from the selected approved cohort. Counts applications, not unique people.",
      jobApps.map((a) => appRow(a)),
    ),
    metric(
      "shortlisted",
      "Shortlisted observed",
      "Current Shortlisted stage or a recorded transition to Shortlisted. Later stages are not used to reconstruct missing history.",
      jobApps
        .filter((a) => a.status === "Shortlisted" || shortlistedIds.has(a.id))
        .map((a) => appRow(a)),
    ),
    metric(
      "interviews",
      "Interview scheduled",
      "Distinct Job applications with a non-cancelled interview schedule. This does not establish attendance or an interview outcome.",
      jobApps
        .filter((a) => interviewIds.has(a.id))
        .map((a) =>
          appRow(
            a,
            interviews
              .filter((i) => i.application_id === a.id)
              .map((i) => `${i.starts_at} · ${i.response}`)
              .join("; "),
          ),
        ),
    ),
    metric(
      "offers",
      "Written offer issued",
      "Saved written Job offers, including declined, withdrawn and expired offers. An Offered recruitment stage alone is insufficient.",
      offers.map((o) => ({
        ...appRow(
          appMap.get(o.application_id),
          o.response === "Pending" && new Date(o.expires_at) <= new Date(now)
            ? "Expired without response"
            : o.response,
        ),
        sourceId: o.id,
      })),
    ),
    metric(
      "accepted",
      "Offer accepted",
      "Written Job offers with an explicit applicant Accepted response.",
      offers
        .filter((o) => o.response === "Accepted")
        .map((o) => ({
          ...appRow(
            appMap.get(o.application_id),
            "Accepted; joining is a separate confirmation",
          ),
          sourceId: o.id,
        })),
    ),
    metric(
      "joined",
      "Joining confirmed",
      "Job offers with Accepted response and both employer and applicant joining timestamps. Counts job offers, not unique people.",
      joined.map((o) => ({
        ...appRow(
          appMap.get(o.application_id),
          `Employer: ${o.employer_joined_at} · Applicant: ${o.applicant_joined_at}`,
        ),
        sourceId: o.id,
      })),
    ),
  ];
  const enrollments = learning.enrollments.filter((e) => ids.has(e.learner_id));
  const programs = new Map(learning.programs.map((p) => [p.id, p]));
  const enrollmentRow = (e) => ({
    id: e.id,
    personId: e.learner_id,
    name: people.get(e.learner_id)?.full_name || "Name not provided",
    title:
      programs.get(e.program_id)?.opportunity.title || "Program unavailable",
    detail: `${e.status}${e.completed_at ? " · " + e.completed_at : ""}`,
    sourceId: e.id,
    href: "/institution/programs?program=" + e.program_id,
  });
  const active = internshipApps.filter(
    (a) =>
      a.status === "Offered" &&
      tracking.arrangements.some(
        (r) =>
          r.application_id === a.id &&
          r.response === "Accepted" &&
          r.start_on &&
          r.start_on <= today,
      ),
  );
  const activeIds = new Set(active.map((a) => a.id));
  const latestReports = new Map();
  for (const r of tracking.reports
    .filter((r) => activeIds.has(r.application_id))
    .sort(latestRecordFirst)) {
    const key = r.application_id + ":" + r.kind;
    if (!latestReports.has(key)) latestReports.set(key, r);
  }
  const reviewQueue = [];
  const correctionQueue = [];
  for (const r of latestReports.values()) {
    const reviews = tracking.reviews
      .filter((v) => v.report_id === r.id)
      .sort(latestRecordFirst);
    const facultyRequired =
      r.kind === "Final" &&
      tracking.supervisors.some(
        (s) =>
          s.application_id === r.application_id &&
          s.kind === "Faculty" &&
          ["Pending", "Accepted"].includes(s.status),
      );
    for (const role of facultyRequired
      ? ["Industry", "Faculty"]
      : ["Industry"]) {
      const review = reviews.find((v) => v.review_role === role);
      const row = {
        ...appRow(appMap.get(r.application_id)),
        id: r.id + ":" + role,
        sourceId: r.id,
        title: r.title,
        detail: `${r.kind} report · ${role}: ${review?.decision || "No review recorded"}`,
      };
      if (!review) reviewQueue.push(row);
      else if (review.decision === "Changes requested")
        correctionQueue.push(row);
    }
  }
  const pendingMilestones = tracking.milestones.filter(
    (m) =>
      activeIds.has(m.application_id) &&
      m.status === "Pending" &&
      tracking.logs.some((l) => l.milestone_id === m.id),
  );
  const completed = tracking.completions.filter((c) =>
    internshipIds.has(c.application_id),
  );
  const assessedIds = new Set(evidence.map((e) => e.user_id));
  const metrics = [
    metric(
      "members",
      "Approved cohort members",
      "Approved members matching the role, department and graduation-year filters.",
      members.map(personRow),
    ),
    metric(
      "assessed",
      "Members with assessment evidence",
      "Unique cohort members with at least one saved industry skill assessment result. Self-declared skills do not count.",
      members.filter((p) => assessedIds.has(p.id)).map(personRow),
    ),
    metric(
      "learning-active",
      "Active learning enrollments",
      "Structured learning-program enrollments with status Enrolled.",
      enrollments.filter((e) => e.status === "Enrolled").map(enrollmentRow),
    ),
    metric(
      "learning-completed",
      "Reviewed learning completions",
      "Publisher-marked Completed learning enrollments. These are participation records, not verified skill proficiency.",
      enrollments.filter((e) => e.status === "Completed").map(enrollmentRow),
    ),
    metric(
      "internships-active",
      "Active internships / projects",
      "Internships, apprenticeships, live projects and faculty internships with an accepted offer, reached start date and Offered application status.",
      active.map((a) => appRow(a, "Accepted and started; not yet completed")),
    ),
    metric(
      "internships-completed",
      "Report-reviewed completions",
      "Saved internship completion records. Older employer-marked Completed stages without reviewed records are excluded.",
      completed.map((c) => ({
        ...appRow(
          appMap.get(c.application_id),
          `Confirmed by ${c.confirmed_name} · ${c.created_at}`,
        ),
        sourceId: c.id,
      })),
    ),
    metric(
      "placement-members",
      "Members with confirmed joining",
      "Distinct cohort members with at least one Job offer confirmed joined by both parties.",
      members.filter((p) => joinedIds.has(p.id)).map(personRow),
    ),
  ];
  const queues = [
    metric(
      "report-reviews",
      "Report reviews pending",
      "Missing latest-version review decisions for active internships. Final reports include an assigned faculty review slot, even if the invitation is still pending.",
      reviewQueue,
    ),
    metric(
      "report-corrections",
      "Report corrections requested",
      "Latest-version report review slots with Changes requested. This is learner follow-up, not a pending reviewer decision.",
      correctionQueue,
    ),
    metric(
      "milestone-reviews",
      "Milestones awaiting review",
      "Pending milestones in active internships with at least one submitted linked log.",
      pendingMilestones.map((m) => ({
        ...appRow(
          appMap.get(m.application_id),
          "Linked work submitted; approval pending",
        ),
        id: m.id,
        sourceId: m.id,
        title: m.title,
      })),
    ),
  ];
  return {
    generatedAt: now,
    filters: {
      role: filters.role || "student",
      department: filters.department || "All",
      year: filters.year || "All",
    },
    options: {
      departments: [...new Set(approved.map(department))].sort(),
      years: [...new Set(approved.map(year))].sort(),
    },
    missingProfiles: [...approvedIds].filter(
      (id) => !platform.directory.some((p) => p.id === id),
    ).length,
    members: members.map(personRow),
    metrics,
    funnel,
    skills,
    queues,
    placementRate: members.length
      ? Math.round((joinedIds.size / members.length) * 100)
      : null,
  };
}
