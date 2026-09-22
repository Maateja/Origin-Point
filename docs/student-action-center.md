# Student action center and optional Gemini advice

`/student` now combines personal applications, learning, report-reviewed internship completions, prioritized actions, and explainable opportunities. Existing Supabase records remain authoritative. No new migration is required.

Actions use deterministic ordering: live written offer responses, upcoming interviews/report corrections, joining follow-up, progress/learning goals, then reassessment prompts. Dates sort within groups. Latest report version and latest review per role determine corrections. Learning completion prompts assessment discovery; it never creates evidence. Workspace links do not preselect records. Sources load independently and all must succeed before the combined dashboard appears.

Matching uses latest industry evidence per canonical skill, with self-declarations distinguished. Rank is the fraction of requirements meeting their issuer targets, not hiring probability, job eligibility, or a substitute for opportunity-specific assessments. Related learning requires a real open student-accessible opportunity with a structured learning program and overlapping unproven skills. Availability, prerequisite and seat checks still occur in the program workflow. No external courses or employers are invented.

## Gemini configuration and boundaries

The server-only `/api/ai/explain-match` route uses Google's generateContent REST endpoint. Configure `GEMINI_API_KEY` in local/server environment secrets and optionally `GEMINI_MODEL` (default matches the existing project's `gemini-2.5-flash`). Never use a `NEXT_PUBLIC_` key or paste secrets into chat. Restart the server after configuration. Model availability and quota depend on your Google project.

The student explicitly opts in on each match. Only required skill names, derived evidence status, scores, and issuer thresholds are sent. The server re-fetches authenticated student evidence and an accessible open opportunity; it does not accept client scores or prompts. Names, email, documents, resumes, offer terms, and other members' evidence are not intentionally included. Skill names are user-authored text and could themselves contain personal information; avoid entering personal information in skill fields.

AI output is plain text, labelled unverified, temporary and not persisted. It cannot invoke tools, change scores, update applications or approve skills. Prompt isolation reduces but cannot eliminate hallucinations or prompt injection; the evidence display remains authoritative. No fake fallback advice is returned on failure. Existing question-generation functionality is unchanged.

There is a 25-second provider timeout, bounded summary/output, and one request per user per minute per server instance. This is not a distributed production quota: configure provider spending limits and a shared rate limiter before scaling to multiple replicas. No provider call runs automatically or during build/tests. Review Google's applicable data-use terms before using real student data.

## Verification

Tests cover ownership, action ordering, expiry, latest evidence/reviews, real program matches, consent, server-derived AI inputs, role checks, throttling and provider failure. AI route tests mock the provider and database; they do not establish live integration availability. Authenticated browser checks and one consented Gemini request still need verification with configured credentials. Also test mobile, reduced motion, loading/errors and each workspace link.

Reference: https://ai.google.dev/api/generate-content
