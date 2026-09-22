/** Aggregate only personal activities and explicitly scoped supervision. @param {any} input */
export function buildAcademicianAnalytics({
  platform,
  tracking,
  learning,
  collaborations,
  supervision,
  now = new Date().toISOString(),
}) {
  const me = platform.profile.id;
  const applications = platform.applications.filter(
    (a) => a.applicantId === me,
  );
  const opportunity = new Map(platform.opportunities.map((o) => [o.id, o]));
  const types = new Set([
    "Internship",
    "Faculty Internship",
    "Apprenticeship",
    "Live Project",
  ]);
  const today = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const row = (id, title, detail, href) => ({ id, title, detail, href });
  const appRow = (a) =>
    row(
      a.id,
      opportunity.get(a.opportunityId)?.title || "Opportunity unavailable",
      a.status,
      "/academician/applications",
    );
  const metric = (id, label, definition, rows) => ({
    id,
    label,
    definition,
    value: rows.length,
    rows,
  });
  const internships = applications.filter((a) =>
    types.has(opportunity.get(a.opportunityId)?.type),
  );
  const active = internships.filter(
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
  const ownIds = new Set(internships.map((a) => a.id));
  const enrollments = learning.enrollments.filter((e) => e.learner_id === me);
  const programs = new Map(learning.programs.map((p) => [p.id, p]));
  const enrollmentRow = (e) =>
    row(
      e.id,
      programs.get(e.program_id)?.opportunity?.title || "Program unavailable",
      e.status,
      "/academician/programs?program=" + encodeURIComponent(e.program_id),
    );
  const proposals = collaborations.proposals.filter(
    (p) => p.owner_id === me || p.proposer_id === me,
  );
  const proposalRow = (p) =>
    row(
      p.id,
      p.title,
      `${p.status} · ${p.organization} · ${p.owner_id === me ? "Opportunity owner" : "Proposer"}`,
      "/academician/collaborations",
    );
  // Supervision is supplied by my_supervision(), never inferred from public profiles.
  const assignments = supervision.filter((s) => s.kind === "Faculty");
  const supervisionRow = (s) =>
    row(
      s.id,
      s.title,
      `${s.applicant_name} · ${s.company} · ${s.status}`,
      "/academician/supervision",
    );
  return {
    generatedAt: now,
    metrics: [
      metric(
        "applications",
        "My applications",
        "Your saved applications only; student applications you supervise are excluded.",
        applications.map(appRow),
      ),
      metric(
        "internships",
        "Active industry engagements",
        "Your accepted internships/projects with a reached start date and Offered application status.",
        active.map(appRow),
      ),
      metric(
        "completions",
        "Reviewed engagement completions",
        "Your saved report-reviewed internship completion records. Legacy Completed stages alone do not count.",
        tracking.completions
          .filter((c) => c.applicant_id === me && ownIds.has(c.application_id))
          .map((c) =>
            row(
              c.id,
              c.title,
              `${c.organization} · ${c.created_at}`,
              "/academician/applications",
            ),
          ),
      ),
      metric(
        "learning",
        "Active learning enrollments",
        "Your Enrolled structured learning programs, including faculty development where published.",
        enrollments.filter((e) => e.status === "Enrolled").map(enrollmentRow),
      ),
      metric(
        "learning-completed",
        "Reviewed learning completions",
        "Publisher-marked Completed enrollments; not automatically verified skill proficiency.",
        enrollments.filter((e) => e.status === "Completed").map(enrollmentRow),
      ),
      metric(
        "supervision",
        "Accessible faculty assignments",
        "Accepted Faculty assignments with current access. Includes completed engagements still accessible; not an active-internship count.",
        assignments
          .filter((s) => s.status === "Accepted" && s.can_access)
          .map(supervisionRow),
      ),
      metric(
        "collaborations",
        "Active collaborations",
        "Accepted proposals in which you are the owner or proposer.",
        proposals.filter((p) => p.status === "Accepted").map(proposalRow),
      ),
      metric(
        "collaborations-completed",
        "Completed collaborations",
        "Participant proposals marked Completed with a saved completion timestamp.",
        proposals
          .filter((p) => p.status === "Completed" && p.completed_at)
          .map(proposalRow),
      ),
    ],
    queues: [
      metric(
        "invitations",
        "Supervision invitations",
        "Pending Faculty invitations on Offered engagements. Accept or decline in supervision; acceptance does not bypass membership checks.",
        assignments
          .filter(
            (s) => s.status === "Pending" && s.application_status === "Offered",
          )
          .map(supervisionRow),
      ),
      metric(
        "access",
        "Supervision access needs attention",
        "Accepted Faculty assignments currently lacking access. Check membership or assignment eligibility in the supervision workspace.",
        assignments
          .filter((s) => s.status === "Accepted" && !s.can_access)
          .map(supervisionRow),
      ),
      metric(
        "proposals",
        "Proposals awaiting your decision",
        "Submitted collaboration proposals on opportunities you own.",
        proposals
          .filter((p) => p.owner_id === me && p.status === "Submitted")
          .map(proposalRow),
      ),
      metric(
        "completion-review",
        "Collaboration completion requests",
        "Accepted proposals you own where the proposer has requested completion. Review deliverables before confirming.",
        proposals
          .filter(
            (p) =>
              p.owner_id === me &&
              p.status === "Accepted" &&
              p.completion_requested_at,
          )
          .map(proposalRow),
      ),
    ],
  };
}
