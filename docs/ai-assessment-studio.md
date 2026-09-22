# Grounded AI assessment drafting

Industry Assessment Studio now uses the versioned `industry-assessment-v1` system prompt in `lib/ai/assessment-prompts.mjs`. Prompts guide inference; this is not model training or fine-tuning. The brief is passed as separate untrusted JSON context, with the actual industry domain, skills, level and focus. Non-software roles should not receive assumed software questions.

Generation requires an authenticated industry profile, an explicit consent field, bounded role/skill inputs and a configured server-side GEMINI_API_KEY. The UI explains what brief fields go to Google; authors must not include confidential or personal material. Model configuration uses GEMINI_MODEL, retaining the existing default. No new migration is needed.

The endpoint requests JSON and validates exact count, required text, four distinct options, integer answer keys, categories, supplied skill names and duplicate questions. Invalid, blocked, truncated or unavailable responses produce errors, not template fallback questions or default answer keys. Structural validation cannot establish correctness, fairness or difficulty; human review and the existing explicit publish approval remain essential. Generated content remains in the local editor until saved through the existing Supabase draft workflow. Nothing auto-publishes.

Timeout: 25 seconds. Best-effort limit: one generation per authenticated user per minute per server instance. Configure Google project quotas and a shared distributed limiter before multi-instance production deployment. This endpoint has a separate in-memory budget from match explanations. No request content or provider errors are logged by this route. No external API calls run during tests.

The UI no longer displays timed, fictional analysis stages. Failures leave the current draft intact. Prompt version is returned with successful responses; it is not persisted as assessment provenance in this phase. Test assertions validate input/output contracts, not live model quality. Live consented generation and a human-reviewed assessment draft still need browser verification.

Reference: https://ai.google.dev/gemini-api/docs/structured-output
