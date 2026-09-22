# Offer acceptance and internship supervision — increment 5

Increment 6 adds private PDF reports and requires final-report approval for future completions. See `internship-reports.md` for the current completion workflow; this document describes increment 5.

## Activate

Apply `supabase/migrations/202609220005_internship_supervision.sql` once in Supabase SQL Editor, after migration `202609220004_application_tracking.sql`, then refresh the app. This migration has been tested with disposable local PostgreSQL data; it is not automatically applied to your connected project.

Existing offered applications are not assumed accepted. Owners must propose dates and applicants must respond. Existing completed records remain untouched. Existing tracking data is retained; new logs/reviews for an offered internship require acceptance and a reached start date.

## Connected workflow

1. Industry offers an internship through Candidates, then proposes start/end dates in the internship panel.
2. The applicant accepts or declines in Applications or Internship Tracking. The response is one-time and dates are frozen afterward. Declining does not silently change the recruitment stage: it is stored as a separate offer response and timeline event.
3. Once accepted and started (Asia/Kolkata date), the owner adds milestones and the applicant submits linked logs. The proposed end date is informational: late reporting remains possible until completion.
4. The opportunity owner can nominate an industry account as mentor. The student's approved institution can nominate an approved academician member as faculty supervisor. An institution cannot replace another institution's active assignment.
5. Nominees use Assigned Supervision to accept or decline. Only accepted supervisors gain access to that internship's timeline, dates, logs and milestone reviews. They do not gain access to unrelated portfolios, documents, assessment reports or application records.
6. Faculty access requires both faculty and applicant to remain approved members of the assigning institution. The assigning party can revoke or replace an assignment while offered, and revoke after completion. Previously viewed/downloaded information cannot be recalled.
7. The owner can complete an accepted, started internship only after all existing milestones are approved. Approval requires a linked applicant log. Completed logs/milestones are read-only. This is not independent certification or a digitally signed contract.

Mentor accounts currently come from the industry directory, not an organization team model. Owners must select an authorized person and confirm the explicit access scope. Revocation and acceptance changes are enforced by the database; open views refresh every 30 seconds or on refocus.

## Acceptance check with real accounts

Propose dates → accept as applicant → invite mentor/faculty → accept assignment → add a milestone as owner → submit a linked log as applicant → approve as supervisor → complete as owner. Check the institution view and applicant portfolio. Also verify a pending nominee cannot read tracking and a revoked nominee loses access.

No demonstration records are inserted into the connected database. All automated fixture records are confined to disposable PGlite databases.

Not included: renegotiating an accepted/declined offer, organization teams, secure report attachments, email notifications, completion certificates or independently verified credentials.
