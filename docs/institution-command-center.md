# Institution command center

The institution dashboard now aggregates the existing platform, internship tracking, recruitment, and learning APIs. No new migration is required; migrations through `202609220011_collaboration_workspaces.sql` remain prerequisites for the platform.

## Scope and definitions

- Only Approved memberships belonging to the signed-in institution enter the cohort. Students are selected by default; role, department and graduation year can narrow the cohort. Missing directory profiles are disclosed and excluded.
- API row-level security remains the access boundary. The client further narrows records to the filtered cohort; this filtering is not a substitute for RLS.
- Skills use the latest saved industry assessment per member and canonical skill. Below-target results use that assessment's issuer threshold. Missing evidence is unknown proficiency, never a failed assessment. Self-declarations and learning participation do not become verified skills.
- Learning counts Enrolled and Completed enrollment records separately. Withdrawn enrollments do not enter either metric.
- Active internships/projects require an accepted arrangement, a reached start date in Asia/Kolkata, and Offered application status. Reviewed completion counts come from saved completion records, not legacy Completed stages.
- Report follow-up inspects the latest version per report kind. Missing review slots and requested corrections are separate counts. Final reports include a faculty review slot for Pending or Accepted faculty assignments. These are follow-up indicators, not proof of eligibility to complete an internship.
- Placement stages count Job applications, saved schedules, and actual written offers. Interview scheduling is not attendance. Cancelled schedules are excluded. Only current Shortlisted stages or recorded Recruitment update transitions establish shortlisting. Missing history is not reconstructed from later stages.
- Written offers include withdrawn, declined, and expired offers. Accepted offers do not establish joining. Joining requires acceptance and both employer and applicant timestamps.
- Confirmed joining rate counts unique members with confirmed joining divided by all selected approved members. An empty denominator displays a dash. This is not an employment rate for all graduates.

## UI and exports

Every metric selects a list of supporting records with source IDs and a link to the relevant workspace. Links open workspaces, not automatically filtered detail records. Skill groups expose assessed, below-target and unassessed members. JSON export contains the filtered model and definitions, excluding compensation and private document paths.

All four data sources must load successfully before metrics or export are enabled. Failed requests are not treated as zeros. Sources refresh independently every 30 seconds, so this is a current operational snapshot, not a transactionally synchronized audit report. There is no date-range or historical cohort filter.

## Verification

Pure aggregation tests cover cohort boundaries, empty filters, skill evidence, placement distinctions, report versions, internship eligibility and learning statuses. Existing database tests separately cover the source APIs' RLS/workflows. Authenticated live verification is still needed: sign in as an institution with approved members, compare metric records to the related workspaces, change all filters, export, and confirm other institutions' members stay inaccessible. Also check responsive layout and keyboard interaction in the browser.
