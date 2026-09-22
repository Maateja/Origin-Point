import { explainReadiness } from "./readiness.mjs";
import { skillKey } from "./skill-taxonomy.mjs";
/** Deterministic next actions; never makes eligibility or hiring decisions. @param {any} input */
export function buildStudentActions({
  platform,
  tracking,
  recruitment,
  learning,
  goals,
  now = new Date().toISOString(),
}) {
  const me = platform.profile.id,
    instant = new Date(now).getTime();
  const apps = platform.applications.filter((a) => a.applicantId === me),
    ids = new Set(apps.map((a) => a.id));
  const ownEvidence = platform.evidence.filter((e) => e.user_id === me);
  const declared = platform.records
    .filter((r) => r.user_id === me && r.kind === "skill")
    .map((r) => r.title);
  const actions = [];
  const add = (id, title, detail, href, priority, due = null) =>
    actions.push({ id, title, detail, href, priority, due });
  if (
    !platform.profile.full_name?.trim() ||
    !platform.profile.department?.trim() ||
    !declared.length
  )
    add(
      "profile",
      "Complete your profile",
      "Add your name, department and declared skills. Declared skills are not assessed proficiency.",
      "/student/profile",
      3,
    );
  for (const i of recruitment.interviews.filter(
    (i) =>
      ids.has(i.application_id) &&
      i.status === "Scheduled" &&
      new Date(i.starts_at).getTime() >= instant &&
      apps.some(
        (a) => a.id === i.application_id && a.status === "Interview Scheduled",
      ),
  ))
    add(
      "interview:" + i.id,
      "Upcoming interview",
      `${i.response} · ${i.starts_at}. Check the schedule and respond if needed.`,
      "/student/recruitment-tracker",
      1,
      i.starts_at,
    );
  for (const o of recruitment.offers.filter((o) => ids.has(o.application_id))) {
    if (o.response === "Pending" && new Date(o.expires_at).getTime() > instant)
      add(
        "offer:" + o.id,
        "Respond to your written offer",
        o.title,
        "/student/recruitment-tracker",
        0,
        o.expires_at,
      );
    if (o.response === "Accepted" && !o.applicant_joined_at)
      add(
        "join:" + o.id,
        "Review your joining confirmation",
        `Proposed date: ${o.joining_on}. Confirm only after you actually join.`,
        "/student/recruitment-tracker",
        2,
      );
  }
  const latest = new Map();
  for (const r of tracking.reports
    .filter((r) => ids.has(r.application_id))
    .sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at) ||
        b.id.localeCompare(a.id),
    )) {
    const k = r.application_id + ":" + r.kind;
    if (!latest.has(k)) latest.set(k, r);
  }
  for (const r of latest.values()) {
    const reviews = tracking.reviews
      .filter((v) => v.report_id === r.id)
      .sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at) ||
          b.id.localeCompare(a.id),
      );
    const roles = [...new Set(reviews.map((v) => v.review_role))];
    if (
      apps.some((a) => a.id === r.application_id && a.status === "Offered") &&
      roles.some(
        (role) =>
          reviews.find((v) => v.review_role === role)?.decision ===
          "Changes requested",
      )
    )
      add(
        "report:" + r.id,
        "Revise your internship report",
        r.title,
        "/student/internships",
        1,
      );
  }
  for (const m of tracking.milestones.filter(
    (m) =>
      ids.has(m.application_id) &&
      m.status === "Pending" &&
      apps.some((a) => a.id === m.application_id && a.status === "Offered"),
  ))
    add(
      "milestone:" + m.id,
      tracking.logs.some((l) => l.milestone_id === m.id)
        ? "Milestone awaiting review"
        : "Submit milestone progress",
      m.title,
      "/student/internships",
      3,
      m.due_on ? m.due_on + "T23:59:59+05:30" : null,
    );
  const myGoals = goals.filter((g) => g.user_id === me && !g.archived);
  for (const g of myGoals) {
    if (g.status !== "Completed")
      add(
        "goal:" + g.id,
        "Continue your learning goal",
        g.skill,
        "/student/learning-plan",
        3,
        g.due_on ? g.due_on + "T23:59:59+05:30" : null,
      );
  }
  const enrolled = learning.enrollments.filter((e) => e.learner_id === me);
  for (const e of enrolled.filter((e) => e.status === "Completed")) {
    const p = learning.programs.find((p) => p.id === e.program_id);
    add(
      "reassess:" + e.id,
      "Check your skills after learning",
      `${p?.opportunity?.title || "Completed program"}: completion does not establish assessed proficiency. Review available assessments.`,
      "/student/industry-assessments",
      4,
    );
  }
  const open = platform.opportunities.filter(
    (o) =>
      o.status === "Open" &&
      ["student", "all"].includes(o.audience) &&
      new Date(o.deadline + "T23:59:59.999+05:30").getTime() >= instant,
  );
  const matches = open
    .filter((o) =>
      ["Job", "Internship", "Apprenticeship", "Live Project"].includes(o.type),
    )
    .map((o) => {
      const skills = explainReadiness(o.skills, declared, ownEvidence),
        backed = skills.filter((s) => s.status === "Assessment-backed").length;
      const gapKeys = new Set(
        skills
          .filter((s) => s.status !== "Assessment-backed")
          .map((s) => skillKey(s.skill)),
      );
      const programs = learning.programs
        .filter(
          (p) =>
            open.some((o) => o.id === p.id) &&
            p.opportunity.skills.some((s) => gapKeys.has(skillKey(s))),
        )
        .map((p) => ({ id: p.id, title: p.opportunity.title }));
      return {
        id: o.id,
        title: o.title,
        company: o.company,
        type: o.type,
        requiresAssessment: o.requiresAssessment,
        skills,
        backed,
        total: skills.length,
        programs,
      };
    })
    .sort(
      (a, b) =>
        (b.total ? b.backed / b.total : -1) -
          (a.total ? a.backed / a.total : -1) || a.title.localeCompare(b.title),
    );
  return {
    actions: actions.sort(
      (a, b) =>
        a.priority - b.priority ||
        (a.due ? new Date(a.due).getTime() : Infinity) -
          (b.due ? new Date(b.due).getTime() : Infinity) ||
        a.id.localeCompare(b.id),
    ),
    matches,
    summary: {
      applications: apps.length,
      learning: enrolled.filter((e) => e.status === "Enrolled").length,
      learningCompleted: enrolled.filter((e) => e.status === "Completed")
        .length,
      internshipCompletions: tracking.completions.filter(
        (c) => c.applicant_id === me && ids.has(c.application_id),
      ).length,
    },
  };
}
