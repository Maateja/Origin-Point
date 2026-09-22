# Private reports and reviewed completion — increment 6

## Activate

Run `supabase/migrations/202609220006_internship_reports.sql` once in Supabase SQL Editor, after migration `202609220005_internship_supervision.sql`. It creates the private `internship-reports` bucket, access policies, report/review/completion tables and authorized RPCs. Refresh the website afterward. No example content is inserted.

Existing completed applications remain untouched and employer-marked, not retrospectively reviewed. Future completion of internships, apprenticeships, live projects and faculty internships requires the new report workflow. Job application completion is unchanged. The existing acceptance/start-date and approved-milestone gates still apply.

## Workflow

- Applicants use Applications or Internship Tracking to upload progress/final PDF reports, titles and summaries. Uploads are limited to 10 MB; the client checks a PDF header and Storage restricts MIME type/size. This is not malware scanning or independent validation of document contents.
- Each submission is immutable. Corrections create a new version of that report type; earlier versions and review decisions remain visible. Only the latest version can be reviewed. A new final report needs fresh approvals.
- The opportunity owner and accepted industry mentor can record industry approval or request changes. The accepted faculty supervisor can record faculty feedback. Approved institutions can read reports and monitor decisions but cannot impersonate faculty reviewers.
- The latest decision for each review role controls approval. All preceding decisions remain visible with reviewer account name and timestamp. Industry approval must come from the owner or a currently accepted mentor. When a faculty assignment is Pending or Accepted, the current accepted faculty supervisor must approve and both memberships must remain approved. Resolve/revoke stale assignments before completion.
- The owner selects **Confirm reviewed completion** in the report panel. The database atomically checks the latest final report, reviewer authority and milestones, saves completion evidence and updates application status/progress. Direct stage updates cannot bypass the final-report workflow.
- The student portfolio shows **Report-reviewed completion**, the organization/title, agreed dates, actual confirmation timestamp, confirming account and the exact industry/faculty reviews plus private final-report download. Account approval is not independent accreditation or a signed certificate. The agreed end date is not represented as a proven last day worked.

## Privacy and operations

The applicant, opportunity owner, currently authorized supervisors and approved institution can access reports. Assignments do not grant access to unrelated portfolios. Object paths include applicant/application UUIDs and a random filename. Reports and reviews are append-only; authenticated users cannot overwrite/delete evidence. Downloads use one-minute signed URLs; a URL already issued remains usable until expiry, and downloaded copies cannot be recalled. Revoking assignments/membership blocks subsequent authorization checks.

Storage upload and database submission are separate operations. If submission fails after upload, the UI reports that explicitly; an administrator may clean up unattached objects after checking `internship_reports.document_path`. No automatic delete policy is enabled, avoiding races that could remove submitted evidence. Establish a retention/deletion policy and malware scanning before a production rollout with sensitive documents.

This increment does not introduce public certificate URLs, e-signatures, email delivery, AI verification or external accreditation claims.

## Verify with real accounts after migration

1. Offer an internship, propose dates, accept as applicant and reach the start date.
2. Upload a progress PDF. Request corrections as owner/accepted mentor; submit a new version as applicant.
3. Upload the final report. Confirm completion is blocked before industry approval.
4. If faculty is assigned, accept the faculty invitation and approve as faculty. A pending invitation or Changes requested decision must block completion.
5. Approve every existing milestone, then confirm reviewed completion as owner.
6. Check the student portfolio, private download and institution view. Confirm unrelated accounts cannot fetch the objects/reports and completed evidence cannot be edited.

Automated checks use disposable PGlite PostgreSQL only. They exercise migration SQL, RLS, storage metadata permissions, versioning, reviewer consent/revocation, approval gates, completion immutability and idempotency. Actual Supabase Storage uploads/downloads and authenticated browser interactions require a live smoke test after applying the migration.
