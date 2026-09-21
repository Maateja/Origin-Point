# Origin Point

Academia–industry collaboration portal for students, industry, academicians, and institutions.

## Data policy

All account and workflow records are stored in Supabase PostgreSQL. Uploaded evidence is stored in a private Supabase Storage bucket. There are no seeded accounts, employers, opportunities, applications, scores, or dashboard metrics, and no localStorage business-data fallback. An empty database produces honest empty states; a missing migration produces a setup error.

The two authored curriculum tracks in `lib/courses-data.ts` are educational content, not user activity. Progress is saved only after a real assessment submission. Gemini-generated questions are explicitly labelled practice: they are not industry-approved exams or verified certifications.

## Implemented workflows

- Role-specific profiles for students, industry, faculty, and institutions, including names, organizations, interests, skills, and credentials.
- Portfolio records for certifications, projects, education, experience, achievements, and documents. Evidence remains self-reported unless independently verified by an administrator.
- Publishing internships, jobs, apprenticeships, training, workshops, mentorship, FDPs, faculty internships, consultancy, research, and live projects.
- Saved opportunities, skill-overlap recommendations, duplicate-safe applications, recruitment stages, feedback, and completion progress.
- Student and faculty institution-membership requests, institution approval, and analytics based on actual approved-member activity.
- Server-generated practice assessments, private answer keys, server-side scoring, immutable submissions, reports, and per-subtopic learning progress.
- JSON exports and responsive role-themed workspaces with loading, error, and empty states.

## Setup

Use Node.js 22 or 24 LTS.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure your project credentials. Never commit secrets.
3. Back up the existing Supabase project and review then apply `supabase/migrations/202609210001_real_platform.sql` **once**, using Supabase SQL Editor or your authenticated migration tooling. It extends existing profiles, replaces profile policies with owner-scoped policies, creates the workflow schema and private bucket, and backfills profiles only for existing real Auth users. It does not insert demonstration data. Next apply `supabase/migrations/202609210002_industry_assessments.sql` once, in order. This adds industry-authored assessments, private question banks, and assessment-backed skill evidence. Do not rerun the first migration if it is already applied.
4. In Supabase Auth, enable email authentication and allow your exact application callback URL (`http://localhost:3000/auth/callback` locally, your HTTPS URL in production). Configure Google OAuth only if using Google sign-in.
5. Configure a verified Resend sender. Set `NEXT_PUBLIC_APP_URL` to your exact HTTPS deployment origin before production password recovery.
6. Set a Gemini API key and a model available to your project for AI assessments. Without it, assessments show a configuration error; other features remain usable.
7. Run `npm run dev` and open http://localhost:3000.

The app keys alone cannot run SQL migrations. A connected Supabase management integration, SQL Editor access, or database migration credentials are required to apply the schema. Until the migration is applied, the new workspace and custom email rate-limiting endpoints are not ready for live use.

## Industry assessments and readiness

Industry accounts can author technical, aptitude, and scenario-based soft-skill MCQs in **Assessment Studio**, linked to an opportunity they own. Drafts and answer keys are private. Publishing records the author's approval and locks the version; a revised version keeps its own history. This is author approval, not independent organisation verification.

Students use **Industry Assessments** for one scored attempt per published version. Start/resume returns no answer key. Submitted answers are scored server-side and saved atomically with per-competency evidence. Raw reports remain private to the student and approved institution; recruiters see evidence summaries only after portfolio-sharing consent through an application. No live demonstration users or questions are inserted.

**Career Readiness** compares an opportunity's exact skill names against self-declared skills and the latest industry assessment evidence. It shows separate missing, self-declared, below-target, and assessment-backed states. Related learning programmes come from actual published opportunities. Qualification/availability eligibility rules, skill aliases, proficiency weights, and practical evaluations remain planned; no complete eligibility or employability score is claimed.

Reports use each assessment's own target and show the latest result per competency rather than averaging incomparable employer and practice thresholds. MCQ scores include the question count; they are unproctored, not certificates. An unfinished attempt can be reopened but selected answers are not saved until submission. The list currently shows the latest 100 accessible assessments.

## Access and privacy

- Normal app operations use the signed-in user's Supabase session and row-level security. The service-role key stays server-side for email delivery, rate limits, and assessment scoring.
- Assigned roles cannot be changed by editing a profile.
- Directory entries omit account email. Student/faculty discoverability is opt-in; industry/institution professional directory entries are visible to signed-in members.
- Applying shares the applicant's portfolio and attached documents with that opportunity owner. Institution approval shares member portfolio, documents, applications, and assessment progress with that institution.
- Documents use 60-second signed links after permission checks. Issued links remain valid until expiry.
- Applicants cannot edit recruiter decisions, self-verify credentials, or submit their own scores.
- The match percentage is normalized exact skill-name overlap, not an employability score or an AI prediction.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Database tests run the migration inside a disposable local PGlite database and exercise RLS, private files, role restrictions, applications, institution consent, assessment transactions, and rate limits. Synthetic identities exist only inside these isolated tests; tests never write to your connected Supabase project.

After applying the migration, verify the real journey with accounts you control: save a profile and credentials, publish an opportunity, apply from an eligible account, review the application, approve institution membership, and submit an assessment. Check persistence after sign-out/sign-in and from a second device.

## Integrations and remaining product work

Resend is used for account emails, Gemini for AI practice questions, and Supabase for Auth, database, and files. External learning resources are links only; institutional ERP/LMS sync, certification-provider verification, institution/employer identity vetting, live chat, practical-task/human-review workflows, and independent credential verification are not implemented integrations. A `verified_at` field is not a verification service.

Before a public launch, add identity vetting, abuse protection/CAPTCHA, document malware scanning, retention/deletion processes, audit logging, monitoring, backups, load testing, and accessibility testing. Email rate limits currently apply per address, not globally. The workspace currently reads authorized records in batches; a large deployment needs server-filtered queries and paginated UI.
