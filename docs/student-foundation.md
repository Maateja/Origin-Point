# Student foundation — increment 1

## Activation

Apply `supabase/migrations/202609220001_student_foundation.sql` after the three existing migrations. It is an additive, transactional migration, with no demo records. It has been tested against disposable local Postgres; it has not been applied to the hosted project by this task.

Until the migration is applied, the existing profile and record-creation workflows remain available. Career preferences and record editing show a setup notice or stay disabled. Reload after applying the migration.

## Delivered

- Student dashboard/profile setup checklist, calculated from saved records rather than an employability score.
- Preferred roles, locations, work modes and availability saved on the account.
- Self-declared skill proficiency, project contributions, related skills and certificate credential IDs.
- Owner editing of unverified portfolio records; existing attachments are preserved. Verified records cannot be edited by their owner.
- Separate declared skills and industry assessment evidence in the shared passport.
- Employers who receive an application and approved institutions see the same career preferences through the existing directory RPC. Ordinary discovery does not expose preferences.
- Applicant review displays the richer project and credential evidence.

## Verification

`npm test` includes real SQL tests for persistence, ownership, shared portfolio access, preference visibility, invalid input, protected verification and immutable verified records. All test data is local and disposable.

After activation, check with real authorized accounts:

1. Save student preferences, reload and confirm they persist.
2. Add and edit a project, certificate and skill. Confirm dates, IDs, contributions and proficiency persist.
3. Confirm a recruiter sees preferences only after the student applies to their opportunity.
4. Approve the student's institution membership and confirm its student view shows the same preferences.
5. Confirm unrelated users cannot read portfolio records or update the student's profile.

## Next increments

Shared skill taxonomy and aliases (including server-side matching), evidence verification workflow, consent-controlled portfolio sharing, learning plans, richer application timelines and the internship lifecycle are not implemented by this increment. Preferences do not yet influence matching or determine eligibility. No new issuer-verification or external learning integration is claimed.
