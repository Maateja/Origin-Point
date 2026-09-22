# Application timelines and internship tracking — increment 4

Superseded workflow rules: increment 5 adds explicit offer acceptance, start dates, assigned supervision and completion gates. See `internship-supervision.md` for the current workflow; the descriptions below document increment 4 only.

Apply `supabase/migrations/202609220004_application_tracking.sql` once, after the earlier migrations. Then refresh. Missing tracking tables do not block existing application decision workflows.

## Delivered

- Database-generated, client-immutable application events for submission and changes to stage, next step, feedback or reported progress. Existing applications get an explicitly labelled current snapshot at migration time, not fabricated historical transitions.
- Timeline panels in applicant and recruiter application pages.
- Student, industry and institution Internship Tracking navigation/pages. Faculty applicants and opportunity owners can use the same panels in their existing Applications/Applicants pages.
- Offered internships, apprenticeships, live projects and faculty internships support owner-defined milestones and applicant-submitted weekly logs/deliverable links.
- Owners can review milestones; approval requires an applicant log linked to that milestone. Institutions have read-only access through approved membership. Other users have no access.
- Completing an application through the existing recruitment controls makes tracking read-only. Student portfolios show the employer-marked completed experience without claiming independent certification.
- Logs are append-only; corrections require another log. Archiving, deletion, file uploads and independently assigned mentor/faculty accounts are not added by this increment.

## Important distinctions

An offer is not acceptance or proof that work started. Milestone approval counts and the recruiter's existing completion-progress percentage are separate measures. Recruiters can mark applications completed using the existing workflow; this does not automatically assert that every milestone was approved. There is no generated certificate or invented completion date. Milestone feedback shows the latest review; the application timeline records recruitment updates, not every milestone-review revision.

## Checks

Local Postgres tests verify event creation, no-op behavior, immutable client history, ownership, offered-only tracking, institution approval, log validation, milestone approval requirements and completed-record read-only behavior. No live applications or logs are created by tests.

After activation, use real accounts to: offer an internship, add a milestone as its owner, submit a linked log as the applicant, approve it as the owner, inspect the institution view, then mark the application completed. Confirm the student's portfolio lists the experience and further tracking edits are blocked.

Next steps: offer acceptance, internship start/end dates, assigned mentor/faculty supervision, secure report attachments and completion review/certificates.
