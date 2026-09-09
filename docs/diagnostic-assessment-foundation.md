# Diagnostic Assessment Foundation

## Purpose

This step introduces a deterministic, version-controlled foundation for the diagnostic assessment system. The application will define what competencies may be assessed, while future AI generation will only phrase questions within those constraints.

## Architecture

```text
Taxonomy
  -> Blueprint
  -> future AI generation
  -> future validation
  -> future scoring
  -> future skill measurement
```

The taxonomy is the controlled curriculum Source of Truth. It does not contain assessment questions.

The blueprint defines assessment coverage/distribution. It does not contain assessment questions.

AI is not the Source of Truth for topics, skills, concepts, levels, or blueprint distribution.

Scoring and skill-profile calculation are intentionally deferred to a later step.

## Taxonomy

The taxonomy follows:

```text
Topic
  -> Skill
      -> Concept
          -> Allowed diagnostic levels
```

The eight existing diagnostic topics and IDs are preserved:

- `dsa` - Programming & DSA
- `web-dev` - Web Development
- `db-sql` - Database & SQL
- `system-design` - System Design
- `ai-ml` - Artificial Intelligence & ML
- `cloud-devops` - Cloud & DevOps
- `cybersecurity` - Cybersecurity
- `os-systems` - Operating Systems

The four existing diagnostic levels are preserved:

- `very-beginner`
- `beginner`
- `intermediate`
- `advanced`

Skills and concepts use topic-scoped stable keys. A concept belongs to one skill, and each concept explicitly declares the levels at which it is assessable. Display labels and descriptions may evolve, but published keys should remain stable.

The taxonomy is defined in `lib/diagnostic-taxonomy.ts` and includes lightweight assertions for duplicate keys, invalid parent relationships, incomplete definitions, and invalid level references.

## Blueprint

The blueprint module defines all 8 x 4 topic/level combinations: 32 deterministic blueprints in total. Every blueprint allocates exactly 10 one-question scoring items across taxonomy concepts and records a controlled question type such as `conceptual`, `code`, `debugging`, `scenario`, or `complexity`.

Blueprint allocations reference existing concepts and their parent skills. They do not contain question text, options, correct answers, or explanations. The blueprint controls representation and coverage, not proficiency percentages.

Blueprints are defined in `lib/diagnostic-blueprints.ts` and carry:

- `diagnostic-taxonomy-v1.0.0`
- `diagnostic-blueprint-v1.0.0`

The module validates that all combinations exist, allocations total 10, concepts are not duplicated within a blueprint, and every concept is valid and allowed for the selected level.

## Stable IDs

Stable identifiers are used for:

- Topic IDs, such as `dsa` and `web-dev`.
- Level IDs, such as `intermediate`.
- Skill keys, such as `dsa.linear-data-structures`.
- Concept keys, such as `dsa.linear-data-structures.hashing`.
- Blueprint IDs, such as `dsa.intermediate`.

Keys are machine-readable, deterministic, human-reviewable, and independent of display labels or AI-generated text. Published keys must not be renamed casually.

## Versioning

The foundation uses:

```text
diagnostic-taxonomy-v1.0.0
diagnostic-blueprint-v1.0.0
```

Future assessment attempts should preserve the taxonomy and blueprint versions used to create them.

## AI Boundary

The application-owned configuration defines the topic, skill, concept, level, allowed coverage, question distribution, question type, stable keys, and versions.

Future AI generation may provide question wording, options, explanations, and scenario context. It must not invent topics, skills, concepts, taxonomy keys, level coverage, or blueprint distribution.

## Scoring

Scoring and proficiency calculation are not implemented in this step. The existing client-side assessment and report behavior remain unchanged.

## Course Separation

Course practice remains separate from diagnostic assessment. The taxonomy and blueprints do not import or modify `lib/courses-data.ts`, course modules, course subtopics, or course completion behavior.

## Changes Made

Created:

- `lib/diagnostic-taxonomy.ts`
- `lib/diagnostic-blueprints.ts`
- `docs/diagnostic-assessment-foundation.md`

## Not Changed

This foundation step intentionally does not change:

- Diagnostic assessment UI or routes.
- Assessment question generation.
- Gemini or OpenAI integration.
- Generated-question validation at the API boundary.
- Existing scoring.
- Reports or localStorage.
- Course assessment or course data.
- Supabase, database schema, or persistence.
- `assessment_attempts` or `skill_profiles`.
- Authentication, middleware, onboarding, or unrelated code.

## Next Step

The immediate next step is to review and approve the taxonomy and blueprint definitions before integrating them into question generation and validation. That integration must preserve the existing public topic and level IDs and keep AI generation downstream of the controlled configuration.

## Implementation Status

Implemented:

- diagnostic taxonomy
- diagnostic blueprints
- documentation

Not implemented yet:

- AI integration with taxonomy
- generated-question validation
- server-side scoring
- assessment persistence
- skill profiles
- report migration
