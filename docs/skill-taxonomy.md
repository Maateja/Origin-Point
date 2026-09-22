# Shared skill matching — increment 2

Apply `supabase/migrations/202609220002_skill_taxonomy.sql` after the student-foundation migration. Then refresh the app. The platform API and assessment submission check taxonomy version 1 before using the new matching/scoring logic. Without the migration, they return a setup error rather than silently disagreeing with database scores.

The curated vocabulary in `lib/skill-taxonomy.mjs` is reference configuration, not mock platform activity. Unknown skills remain valid and use case/whitespace-normalized exact matching. Only explicitly listed aliases are equivalent. SQL is not PostgreSQL, React is not React Native, and Java is not JavaScript.

## Connected behavior

- Student declared skills, opportunity match explanations and readiness use the same keys.
- Alias requirements count once in the match denominator.
- Learning recommendations compare normalized skill keys.
- Institution demand counts each unique skill once per opportunity.
- Server assessment scoring groups alias question areas together. The database evidence trigger counts questions using the same keys.
- The application RPC calculates the match score itself; the client cannot supply a score.
- Profile and portfolio forms suggest known names but still accept new skills.

Original record titles, historical evidence and saved application scores are not rewritten. Existing duplicate skill records remain editable; they count once in comparisons. Submitting an application again uses the existing RPC's update behavior and recalculates its score. Readiness uses the latest evidence across aliases rather than the highest result. A historical report containing separate alias groups retains those original entries; date ties use the existing deterministic evidence-ID ordering.

## Verification

`npm test` checks every declared alias against the SQL function, server/client match parity, deduplication, related-but-distinct skills, latest-evidence behavior and assessment grouping. Test records exist only in disposable local Postgres.

After migration, use existing authorized accounts to check that React.js in a student profile matches React in an industry opportunity and its readiness screen. Confirm the stored application score agrees. No automated live applications or assessments were submitted by this task.

The next step is personalized learning plans with saved goals and progress. Matching does not infer eligibility, certify proficiency, or guarantee selection.
