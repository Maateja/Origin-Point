# Student Profile & Onboarding Workflow Documentation

This document records the architecture, schema definitions, data flow, and implementation details for the **Student Profile and Onboarding system** in Origin Point. Any developer or IDE continuing work on this project should refer to this specification.

---

## 1. Core Database Architecture

The system uses two interconnected Supabase tables for student accounts:

```
[auth.users] (Supabase Auth)
       │
       ▼ (1:1 cascade)
[public.profiles] (Base account info across all 4 roles)
       │
       ▼ (1:1 cascade)
[public.student_profiles] (Student-specific academic & skill profile)
```

### Table Definitions & Roles

#### A. `public.profiles`
The primary table for **all** user roles (`student`, `industry`, `academician`, `institution`).
* `id` (UUID, Primary Key, references `auth.users(id)`)
* `email` (TEXT)
* `full_name` (TEXT)
* `role` (TEXT: `'student' | 'industry' | 'academician' | 'institution'`)
* `avatar_url` (TEXT)
* `headline` (TEXT)
* `location` (TEXT)
* `bio` (TEXT)
* `onboarding_completed` (BOOLEAN, default `FALSE`)
* `created_at` (TIMESTAMPTZ)
* `updated_at` (TIMESTAMPTZ)

#### B. `public.student_profiles`
The 1:1 extension table storing self-reported student academic data, interests, and skills:
* `id` (UUID, Primary Key, references `public.profiles(id)`)
* `headline` (TEXT)
* `bio` (TEXT)
* `location` (TEXT)
* `institution` (TEXT) - e.g. College or University name
* `department` (TEXT) - e.g. Computer Science, Mechanical, etc.
* `academic_year` (TEXT) - e.g. "3rd Year", "2026"
* `self_reported_skills` (TEXT[]) - Array of selected/saved skills
* `career_goals` (TEXT) - Serialized JSON or comma-separated list of student goals
* `interests` (TEXT[])
* `experience_level` (TEXT)
* `created_at` (TIMESTAMPTZ)
* `updated_at` (TIMESTAMPTZ)

---

## 2. Supabase Migration: `004_student_profiles_sync.sql`

The complete idempotent migration script is located at:
* [`lib/supabase/migrations/004_student_profiles_sync.sql`](file:///a:/Sep2026/upfront/Origin-Point/lib/supabase/migrations/004_student_profiles_sync.sql)
* [`lib/supabase/migrationn/004_student_profiles_sync.sql`](file:///a:/Sep2026/upfront/Origin-Point/lib/supabase/migrationn/004_student_profiles_sync.sql)

### Running the Migration in Supabase:
Open your [Supabase Project Dashboard](https://supabase.com/dashboard) &rarr; **SQL Editor** &rarr; Paste and run the contents of `004_student_profiles_sync.sql`.

Key highlights:
1. `ADD COLUMN IF NOT EXISTS` ensures safety against existing schemas.
2. Uses high-performance RLS caching pattern `((SELECT auth.uid()) = id)` rather than naked `auth.uid() = id`, optimizing queries by 5–10x.
3. Separate policies for `SELECT`, `UPDATE`, and `INSERT` with `WITH CHECK` clauses preventing unauthorized role manipulation.

---

## 3. Onboarding & Assessment Flow

### Step-by-Step Flow:
1. **Student Sign-Up / Role Selection:**
   * User registers or selects the "Student" role (`/select-role` or `/signup?role=student`).
   * Middleware intercepts un-onboarded students visiting `/student` and directs them to `/onboarding`.
2. **Onboarding Form (`app/(auth)/onboarding/page.js`):**
   * **Step 1 (Welcome):** Overview of setup.
   * **Step 2 (Profile):** Institution, Department, Year, Location.
   * **Step 3 (Skills):** Selection of skills from curated list (JavaScript, React, Python, SQL, etc.).
   * **Step 4 (Goals):** Selection of career objectives (Internships, Full-time Job, Portfolio, etc.).
   * **Step 5 (Ready!):** Handoff screen.
3. **Smart Handoff on Completion:**
   * Instead of a forced test or an abrupt redirect, the user is presented with two clear choices:
     * **Primary Action ("Start [Skill] Test"):** The app detects the student's primary selected skill, maps it to the corresponding diagnostic assessment topic (`web-dev`, `dsa`, `db-sql`, `ai-ml`, `cloud-devops`), saves onboarding, and routes straight to `/student/assessment/take/[topicId]/beginner`.
     * **Secondary Action ("Go to Dashboard"):** Saves onboarding and routes directly to `/student`.
4. **Backend Persistence (`app/api/onboarding/route.js`):**
   * Authenticates the user session.
   * Upserts `institution`, `department`, `academic_year`, `location`, `self_reported_skills`, and `career_goals` into `student_profiles`.
   * Updates `profiles` with `location`, `onboarding_completed: true`, and `updated_at`.

---

## 4. Student Profile Page (`app/(dashboard)/[role]/profile/page.js`)

Previously, this page showed static mock data ("Priya Sharma", "IIT Delhi", etc.) and discarded location and bio changes on save. It is now completely dynamic:

1. **Data Loading:**
   * Fetches `full_name`, `headline`, `location`, `bio` from `profiles`.
   * For student accounts, additionally fetches `institution`, `department`, `academic_year`, and `self_reported_skills` from `student_profiles`.
2. **Data Saving (`handleSave`):**
   * Updates `full_name`, `headline`, `location`, and `bio` in `profiles`.
   * Updates `headline`, `location`, `bio`, `institution`, `department`, `academic_year`, and `self_reported_skills` in `student_profiles`.
   * Syncs user display name with `supabase.auth.updateUser()`.
3. **Interactive Features:**
   * **Skills Management:** Users can add new skills or remove existing skills using badges.
   * **Dynamic Profile Strength:** Calculates completion percentage (0–100%) based on filled fields rather than a static hardcoded number.
   * **Checklist:** Dynamically checks off completed profile sections.

---

## 5. Student Portfolio Page (`app/(dashboard)/student/portfolio/page.tsx`)

* Removed hardcoded `"Student User"` and `"IIT Delhi"`.
* Dynamically fetches and renders the student's real name, academic background (Department, College, Year), and self-reported skills from `profiles` and `student_profiles`.
* Generates avatar initial from the student's real name.

---

## 6. Files Changed in this Update

| File Path | Description of Changes |
| :--- | :--- |
| `lib/supabase/migrations/004_student_profiles_sync.sql` | New migration establishing full schema alignment and RLS. |
| `lib/supabase/migrationn/004_student_profiles_sync.sql` | Identical migration kept in legacy folder for compatibility. |
| `app/api/onboarding/route.js` | Updated to sync `location` to `profiles` along with `onboarding_completed`. |
| `app/(auth)/onboarding/page.js` | Added skill-to-diagnostic mapping and dual CTA (Start Diagnostic Test vs Go to Dashboard). |
| `app/(dashboard)/[role]/profile/page.js` | Connected to real `profiles` & `student_profiles` data, dynamic strength score, interactive skills. |
| `app/(dashboard)/student/portfolio/page.tsx` | Replaced hardcoded data; wired dynamic skill badges and experience timeline to real assessment scores. |
| `components/dashboard/role-overview.jsx` | Connected student dashboard metrics, time greeting, profile strength, focus tasks, and activity to live Supabase data. |
| `app/(dashboard)/student/assessment/page.tsx` | Added verified score badges and completed status markers for assessed topics from Supabase. |
| `lib/ai/gemini.js` | Updated model to `gemini-2.5-flash` to resolve 404 errors with legacy flash endpoints. |
| `app/api/assessment-questions/route.ts` | Dynamic Gemini 2.5 JSON question generation with domain-tailored distractors and rotated answer keys in fallback mode. |
| `app/api/course-questions/route.ts` | Updated to `gemini-2.5-flash` with JSON mime type. |
| `app/api/assessment/submit/route.ts` | Persists `latest_assessment`, updates `assessment_scores` JSON dictionary, and calculates `overall_skill_score` in `student_profiles`. |
| `app/(dashboard)/student/report/page.tsx` | Fallback loader from `student_profiles.latest_assessment` when localStorage is empty. |
| `docs/student-profile-workflow.md` | This architectural reference and changelog. |

---

## 7. Assessment Engine & Gemini AI Integration

### Root Cause of Repeated Questions:
1. **Model Deprecation / 404:** The application was targeting `gemini-1.5-flash`, which returned `404 Not Found` for the configured Google AI API key.
2. **Identical Distractors in Fallback:** When the AI call threw an error, the code executed `buildFallbackQuestions()`, which had hardcoded:
   ```javascript
   options: [
     concept.description,
     "An unrelated infrastructure configuration task",
     "A user-interface styling preference",
     "A database credential rotation procedure"
   ],
   correctAnswer: 0
   ```
   This resulted in every question having the exact same distractors and option 0 (the first option) always being the correct answer.

### Solution:
* **`lib/ai/gemini.js`**: Standardized on `gemini-2.5-flash` using `responseMimeType: "application/json"`.
* **`app/api/assessment-questions/route.ts`**:
  * Calls `gemini-2.5-flash` with blueprint concept constraints.
  * Resilient JSON parsing and schema validation.
  * In fallback mode, distractor generation generates topic-specific plausible alternatives with shuffled/rotated `correctAnswer` indexes (0 through 3), preventing identical options and predictable answer keys.

---

## 8. Assessment Results Persistence & Score Tracking

To avoid fragile and overly complex relational joins while still ensuring students' scores and assessment reports are saved and accessible across devices, assessment results are stored directly on `student_profiles`:

### Schema Additions on `student_profiles`:
* `latest_assessment` (`JSONB`): Full assessment submission object containing `{ id, topicId, level, score, totalQuestions, passed, percentage, answers, topicBreakdown, completedAt }`.
* `assessment_scores` (`JSONB`): Key-value dictionary tracking highest/latest score per topic, e.g. `{"web-dev": 80, "dsa": 70}`.
* `overall_skill_score` (`INTEGER`): Computed average across all tested topic scores (0–100).
* `verified_skills` (`TEXT[]`): Skills verified via passed assessments.

### Cross-Device Report Recovery (`/student/report`):
* The assessment submission flow writes the result to `localStorage` (for instant display) AND submits to `/api/assessment/submit`.
* When `/student/report` loads, if `localStorage` has no active report (e.g., student switched browsers, refreshed on a different device, or opened via a shared link), it automatically fetches `student_profiles.latest_assessment` from Supabase and restores the complete interactive report.

---

## 9. Live Student Dashboard & Ecosystem Data Wiring (Step 2)

All static placeholders and mock data on the student workspace have been replaced with live Supabase and dynamic assessment state:

### A. Student Overview Dashboard (`components/dashboard/role-overview.jsx`):
1. **Dynamic Greetings & Banner:**
   - Time-of-day greeting (`Good morning`, `Good afternoon`, `Good evening, [FirstName]`).
   - Eyebrow displays real `[Department] · [Institution]`.
   - Adaptive hero banner headline & description changes based on whether the student has completed their diagnostic assessment.
   - Dual Call-to-Action adapts intelligently (e.g. "View skill report" + "Take another assessment" vs "Start skill assessment" + "Explore matches").
2. **Real Metric Cards:**
   - **Skill score:** Shows `student_profiles.overall_skill_score` or `latest_assessment.percentage` (or `—` if not yet tested).
   - **Assessments done:** Accurate count of completed and verified assessment topics from `student_profiles.assessment_scores`.
   - **Profile strength:** Dynamic 0–100% calculation based on completed fields in `profiles` and `student_profiles`.
3. **Adaptive Focus Items & Recent Activity:**
   - Focus recommendations dynamically update based on whether the student has taken an assessment.
   - Activity feed shows real events (e.g. `Scored 80% in web dev assessment`, `Added React, Python to self-reported skills`, `Completed student onboarding profile`).

### B. Assessment Hub (`app/(dashboard)/student/assessment/page.tsx`):
1. Loads `student_profiles.assessment_scores` on mount.
2. Assessed topics display an immediate green badge with the certified score (e.g. `✓ 80%`) and status `Certified · Verified`.

### C. Student Portfolio Page (`app/(dashboard)/student/portfolio/page.tsx`):
1. **Dynamic Skill Badges:** Automatically maps `student_profiles.assessment_scores` to domain badges (`Web Development`, `Database & SQL`, `Algorithms & DSA`, `System Design`), marking badges as earned (with proficiency tier) if score $\ge$ 50%.
2. **Dynamic Experience Timeline:** Includes the student's real university program and verified assessment completion records with timestamp and score.


