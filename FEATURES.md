# Origin Point Features and Implementation Guide

## 1. Application Overview

Origin Point is a Next.js application for connecting students, industry recruiters, academicians, and institutions around skills, learning, assessments, opportunities, and talent discovery.

The current application combines:

- Supabase authentication and user profiles.
- Role-based portal experiences for four user types.
- Student learning and assessment flows.
- AI-assisted assessment-question generation with deterministic fallbacks.
- Reusable dashboard layouts and UI primitives.
- Demo workspace views for recruitment, research, consultancy, internships, and institutional analytics.
- Local browser storage for assessment reports and course progress where database persistence is not yet implemented.

The application is currently a functional product prototype. Authentication and password recovery are connected to Supabase, while several business workflows still use static records, local state, or demonstration data.

## 2. Technology and Architecture

### Frontend

- Next.js `14.2.35` with the App Router.
- React 18.
- JavaScript, JSX, and selected TypeScript files.
- Tailwind CSS for styling.
- Framer Motion for page transitions and interface animation.
- Lucide React for icons.
- `next-themes` for light and dark theme support.
- React Hook Form and Zod for form state and validation.
- Base UI and shadcn-style primitives for reusable controls.

### Backend and services

- Supabase Auth for email/password authentication, Google OAuth, sessions, and password recovery.
- Supabase PostgreSQL for the `profiles` table and user profile data.
- Supabase SSR clients for browser and server access.
- Supabase admin client for server-only user creation and user-directory operations.
- Google Gemini integration for optional AI question generation.
- Optional OpenAI integration in assessment routes when its environment variable is configured.

### Route groups

- `app/(auth)` contains authentication and onboarding screens.
- `app/(dashboard)` contains role workspaces. Parentheses are route groups and do not appear in URLs.
- `app/api` contains server route handlers.
- `components` contains reusable dashboard, branding, and UI components.
- `lib` contains Supabase clients, role state, course data, AI setup, and utility functions.

## 3. Public and Authentication Features

### Landing page: `/`

Implemented in `app/page.js`.

Features:

- Origin Point branding and wordmark.
- Hero section describing the academia-industry collaboration platform.
- Remote background video/visual treatment.
- Navigation links and calls to action for entering the platform or signing up.
- Role-oriented product messaging for students, industry users, academicians, and institutions.
- Animated presentation using Framer Motion.

Current limitation:

- Some navigation items are anchor links intended for future sections and do not currently open separate content sections.

### Login: `/login`

Implemented in `app/(auth)/login/page.js`.

Features:

- Email and password form.
- Email normalization before submission.
- Client-side validation with React Hook Form and Zod.
- Supabase password authentication.
- Google OAuth sign-in.
- Loading states and readable authentication errors.
- Redirect to the user role dashboard when a profile role exists.
- Redirect to role selection when a signed-in user has no usable role.
- Link to forgot-password and signup flows.
- Password visibility control.

### Signup: `/signup`

Implemented in `app/(auth)/signup/page.js` and `app/api/auth/signup/route.js`.

Features:

- Progressive signup form.
- Role selection for student, industry, academician, and institution users.
- Full name and email/password collection.
- Password confirmation validation.
- Duplicate-email handling.
- Server-side user creation through the Supabase admin API.
- Automatic email confirmation in the current signup implementation.
- Profile creation or update with name, email, and role.
- Immediate sign-in after successful account creation.
- Google OAuth signup path.
- Temporary role/name handoff through browser storage and a cookie for the post-signup flow.

Current limitation:

- The API does not currently enforce a server-side allowlist for the submitted role. The client presents the supported roles, but server validation should be added before production use.

### Role selection: `/select-role`

Implemented in `app/(auth)/select-role/page.js`.

Features:

- Interactive role-wheel selection interface.
- Four supported roles: student, industry, academician, and institution.
- Authenticated-user profile role update.
- Redirect to the selected role workspace.
- Redirect to signup when an unauthenticated visitor attempts to continue.
- Animated selection feedback.

### Onboarding: `/onboarding`

Implemented in `app/(auth)/onboarding/page.js`.

Features:

- Five-step onboarding wizard.
- Profile information collection.
- Skills and interests collection.
- Goals and preferences collection.
- Step navigation and progress indication.
- Final redirect to the student workspace.

Current limitation:

- The collected onboarding state is client-side only and is not yet persisted to Supabase.

### Forgot password: `/forgot-password`

Implemented in `app/(auth)/forgot-password/page.js` and `app/api/auth/forgot-password/route.js`.

Features:

- Email validation.
- Account lookup through the server route.
- Supabase recovery-email dispatch through `resetPasswordForEmail`.
- Redirect back to the application recovery callback.
- Clear success state telling the user to check their email.
- Resend-email action with a countdown to reduce repeated requests.
- Google-account detection and explanatory messaging for accounts originally created through Google OAuth.
- Error handling for missing accounts, provider errors, and unexpected failures.

Important setup requirement:

- Email delivery depends on SMTP/email provider configuration in Supabase Authentication settings. Generating a recovery URL is not the same as sending an email; the current route uses Supabase Auth email dispatch.

### Reset password: `/reset-password`

Implemented in `app/(auth)/reset-password/page.js`.

Features:

- Supabase recovery-session detection.
- Recovery-event listener for links that establish a session asynchronously.
- Invalid or expired-link state.
- New password and confirmation fields.
- Password visibility controls.
- Minimum password-length validation.
- Password update through `supabase.auth.updateUser`.
- Profile timestamp update after a successful password change.
- Success state with links to the workspace and login.

### Supabase callback: `/auth/callback`

Implemented in `app/auth/callback/route.js`.

Features:

- Exchanges Supabase OAuth or recovery codes for a session.
- Handles recovery links that should continue to `/reset-password`.
- Looks up the authenticated user profile.
- Resolves a valid role from the existing profile or OAuth metadata.
- Creates or updates the base profile record.
- Redirects users to the correct role workspace.
- Handles missing-code and failed-exchange cases.
- Includes a fallback for users who already have a valid session.

### Internal style guide: `/style-guide`

Provides an interactive showcase of the application visual language and reusable interface elements. It is intended for development and design-system review rather than end users.

## 4. Dashboard Shell and Shared Experience

All role workspaces use shared dashboard building blocks where applicable.

### Dashboard shell

Implemented in `components/dashboard/dashboard-shell.tsx`.

Provides:

- Shared page frame.
- Sidebar navigation.
- Top bar.
- Mobile navigation support.
- Role-specific visual tokens and navigation configuration.
- Consistent content spacing and responsive behavior.

### Sidebar and top bar

Implemented in `components/dashboard/sidebar.tsx` and `components/dashboard/top-bar.tsx`.

Provides:

- Role-aware navigation.
- Current-page navigation state.
- User/profile access.
- Theme controls.
- Search, notification, and account-area presentation.
- Responsive desktop and mobile behavior.

### Mobile bottom navigation

Implemented in `components/dashboard/mobile-bottom-nav.jsx`.

Provides a compact navigation pattern for smaller screens.

### Role overview

Implemented in `components/dashboard/role-overview.jsx`.

Provides reusable overview layouts containing:

- Welcome and role context.
- Statistic blocks.
- Recent activity.
- Recommended or matching content.
- Empty-state handling.

### Workspace page

Implemented in `components/dashboard/workspace-page.jsx`.

Provides reusable pages for static or semi-static workspace modules, including:

- Page heading and description.
- Summary statistics.
- Search and filter controls.
- Tables, cards, lists, and calendar-style views.
- Configurable records and labels.
- Empty and informational states.
- Transient action feedback for prototype interactions.

## 5. Student Portal

### Student overview: `/student`

Features:

- Student welcome area.
- Sample skill and progress metrics.
- Match and opportunity summaries.
- Recent activity presentation.
- Assessment awareness and links into learning workflows.
- Shared dashboard navigation and profile access.

The overview metrics and records are currently demonstration data, with assessment awareness reading from locally stored progress where applicable.

### Assessment catalog: `/student/assessment`

Features:

- Course and assessment catalog.
- Topic selection.
- Difficulty or level selection.
- Entry points into course learning and diagnostic assessment flows.
- Course cards and learning metadata from `lib/courses-data.ts`.

### Assessment attempt: `/student/assessment/take/[topicId]/[levelId]`

Features:

- Dynamic topic and level route parameters.
- Ten-question assessment experience.
- Question loading from the assessment API.
- Curated fallback questions when AI services are unavailable.
- Answer selection and progress tracking.
- Local scoring after submission.
- Question-by-question result information.
- Report generation and local persistence for later report views.

### Course details: `/student/assessment/course/[courseId]`

Features:

- Course overview.
- Eight-module course structure.
- Level grouping.
- Module navigation.
- Completion indicators.
- Local completion tracking in the browser.

### Course learning module: `/student/assessment/course/[courseId]/learn/[moduleId]/[subtopicId]`

Features:

- Topic and subtopic study material.
- Explanations and learning content.
- External learning resources.
- Practice quiz.
- Answer review and feedback.
- Local module completion state.

### Student reports: `/student/report`

Features:

- Reads completed assessment reports from browser storage.
- Aggregates attempts into a report list.
- Shows score and completion summaries.
- Links to detailed report views.

### Detailed report: `/student/report/[reportId]`

Features:

- Overall assessment score.
- Question review.
- Correct and incorrect answer presentation.
- Skill breakdown.
- Gap recommendations.
- Report-specific route handling.

### Marketplace: `/student/marketplace`

Features:

- Opportunity listing cards.
- Search/filter presentation.
- Opportunity metadata.
- Save and Apply controls.
- Local filter state for the current view.

Current limitation:

- Opportunities are static records. Save and Apply actions do not currently persist or submit an application.

### Applications: `/student/applications`

Features:

- Application history layout.
- Status cards.
- Opportunity and organization information.
- Progress/status presentation.

Current limitation:

- Application history is static and is not currently connected to a database-backed application workflow.

### Portfolio: `/student/portfolio`

Features:

- Student profile summary.
- Skills and badges.
- Experience timeline.
- Portfolio presentation.
- Share and export controls.

Current limitation:

- Share and export controls are presentational and do not yet create a public portfolio or download a generated file.

## 6. Industry Portal

### Industry overview: `/industry`

Provides a recruiter-oriented overview with sample hiring metrics, candidate activity, and workspace navigation.

### Post an opportunity: `/industry/post`

Provides an opportunity-composer interface for creating a role, internship, or project post.

Current limitation:

- The composer is currently a UI workflow and does not persist a submitted opportunity.

### Candidates: `/industry/candidates`

Provides:

- Candidate discovery layout.
- Candidate cards or rows.
- Search and filter presentation.
- Skill and match information.

Current limitation:

- Candidate records are static demonstration data.

### Shortlist: `/industry/shortlist`

Provides a shortlist board for reviewing selected candidates and organizing hiring activity.

Current limitation:

- Shortlist changes are not persisted to a database.

### Programs: `/industry/programs`

Provides a calendar/list view for learning, hiring, or engagement programs.

Current limitation:

- Program records and actions are static or locally scoped.

## 7. Academician Portal

### Academician overview: `/academician`

Provides a faculty-oriented overview with sample student, research, and engagement indicators.

### Faculty development programs: `/academician/fdps`

Provides an FDP calendar and program listing view.

### Consultancy: `/academician/consultancy`

Provides a consultancy opportunity or engagement board.

### Research: `/academician/research`

Provides a research-network and collaboration-oriented view.

### Internships: `/academician/internships`

Provides internship and opportunity cards relevant to academic users.

The nested academician pages use `WorkspacePage` and currently rely on static configuration and sample records.

## 8. Institution Portal

### Institution overview: `/institution`

Provides an institution-level overview with sample readiness, placement, and partnership indicators.

### Skills analytics: `/institution/skills`

Provides skill-distribution and comparison visualizations, including bar-style analytics.

### Placement: `/institution/placement`

Provides a placement tracking and status board.

### Recruitment: `/institution/recruitment`

Provides an employer and partner recruitment view.

### Students: `/institution/students`

Provides a student-success or student-readiness roster.

### Departments: `/institution/departments`

Provides department comparison and summary information.

These pages are implemented as reusable workspace views backed by static demo configuration. They are ready for connection to institution, department, student, placement, and employer data services.

## 9. Shared Profile Feature

Available through `/{role}/profile`, implemented in `app/(dashboard)/[role]/profile/page.js`.

Features:

- Loads the signed-in user identity from Supabase.
- Displays the user name, email, role context, and profile presentation.
- Allows the display name to be edited.
- Persists the display name to the `profiles` table.
- Updates corresponding authentication metadata where applicable.
- Supports the shared dashboard profile entry point for each role.

Current limitation:

- Headline, location, biography, skills, and profile-photo controls are not yet fully persisted.

## 10. API Endpoints

### `POST /api/auth/signup`

Purpose: creates a user account and base profile.

Implementation:

- Parses signup data.
- Checks whether the email already exists.
- Creates the user through the Supabase admin client.
- Auto-confirms the account in the current implementation.
- Upserts the corresponding `profiles` row.
- Returns a success or error response.

### `POST /api/auth/forgot-password`

Purpose: requests a password-recovery email.

Implementation:

- Validates and normalizes the email address.
- Checks the Supabase user directory.
- Builds the application recovery callback URL.
- Calls Supabase Auth `resetPasswordForEmail` so the configured email provider dispatches the message.
- Identifies Google-origin accounts for explanatory UI messaging.
- Returns a success or error response.

Requirement: Supabase SMTP or another supported email provider must be configured for actual delivery.

### `POST /api/auth/reset-password`

Purpose: server-side administrative password reset endpoint.

Implementation:

- Finds a user by email.
- Updates that user’s password using the admin API.
- Updates the related profile timestamp.

Current limitation and security note:

- The current reset-password page uses the secure recovery session and `supabase.auth.updateUser` instead of this endpoint.
- This administrative endpoint does not currently verify a recovery token or authenticated user. It should not be exposed for general client use without additional authorization checks.

### `POST /api/assessment-questions`

Purpose: generates assessment questions for a topic and level.

Question-source order:

1. OpenAI, when configured and available.
2. Gemini, when configured and available.
3. Deterministic curated questions as a reliable fallback.

The response includes question data, topic/level context, and the source used.

### `GET /api/course-questions`

Purpose: returns deterministic course or subtopic questions for a requested learning context.

### `POST /api/course-questions`

Purpose: generates course-learning questions.

Question-source order:

1. OpenAI, when configured and available.
2. Gemini, when configured and available.
3. Deterministic fallback questions.

## 11. Reusable UI Components

### Branding and shared content

- `OriginWordmark` and logo components for consistent product branding.
- `SkillTag` for skill labels.
- `StatCard` for dashboard metrics.
- `MatchScoreRing` for match or readiness scores.
- `ApplicationStepper` for application progress.
- `EmptyState` for no-data screens.
- `Skeleton` for loading placeholders.

### UI primitives

The `components/ui` directory contains reusable controls including:

- Button.
- Input.
- Card.
- Badge.
- Avatar.
- Dialog.
- Dropdown menu.
- Select.
- Tabs.
- Table.
- Sonner/toast integration.
- Google icon.
- Option wheel.

These components provide shared styling, focus behavior, responsive sizing, and interaction patterns across auth and dashboard pages.

### Theme support

- `ThemeProvider` integrates theme state.
- `ThemeToggle` switches the visual theme.
- `globals.css` defines global styles, role-aware color tokens, auth styling, dashboard styling, and responsive behavior.

## 12. Data and Persistence Model

### Currently persisted in Supabase

- Authentication users.
- Passwords managed by Supabase Auth.
- Google OAuth identity information.
- Base profile fields such as ID, email, full name, role, and timestamps.
- Profile display-name changes.

### Currently persisted in browser storage

- Assessment attempts and reports.
- Course/module completion state.
- Some temporary signup and onboarding state.
- Locally scoped UI selections and filters.

### Currently static or prototype-only

- Marketplace opportunities.
- Student applications.
- Portfolio sharing/export.
- Industry candidates and shortlists.
- Industry programs.
- Academician FDP, consultancy, research, and internship records.
- Institution departments, placements, recruitment, student rosters, and analytics.
- Most dashboard summary metrics.

## 13. Authentication and Security Implementation

Implemented protections and mechanisms:

- Supabase Auth session management.
- Browser and server Supabase clients.
- OAuth callback handling.
- Recovery-code exchange.
- Profile role resolution.
- Server-only service-role client for admin operations.
- Password reset through a recovery session.
- Route-level redirects based on authentication state in relevant flows.

Important production considerations:

- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` must never be exposed to browser code.
- Supabase redirect URLs must include the deployed callback URL.
- SMTP must be configured for password-recovery delivery.
- Row Level Security policies must protect the `profiles` table.
- Server-side role validation should be added to signup and role update operations.
- Dashboard route protection should be implemented in middleware before production deployment. The current middleware is a scaffold/no-op.

## 14. Environment Variables

The application may require:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
SUPABASE_SECRET_KEY=your_server_only_secret_key
OPENAI_API_KEY=optional_openai_key
GEMINI_API_KEY=optional_gemini_key
INNGEST_EVENT_KEY=optional_inngest_event_key
INNGEST_SIGNING_KEY=optional_inngest_signing_key
```

Only the public Supabase URL and anonymous key may be used in browser-side code. Service-role and secret keys belong only in server environments.

## 15. Current Gaps and Next Implementation Areas

The most important areas still requiring implementation are:

1. Add database tables and server actions for opportunities, applications, candidates, shortlists, programs, research, consultancy, internships, departments, placements, and analytics.
2. Persist onboarding data and the complete editable profile.
3. Replace static role-workspace records with Supabase queries.
4. Persist assessment history and course progress in the database so they work across devices.
5. Implement real marketplace Apply and Save behavior.
6. Implement portfolio sharing and export.
7. Add server-side role allowlisting and authorization checks.
8. Protect dashboard routes through middleware and server-side session checks.
9. Secure or remove the administrative reset-password endpoint unless it has a restricted administrative use case.
10. Add automated tests for authentication, recovery email dispatch, callback handling, role redirects, assessment scoring, and persistence.

## 16. Local Development

From the `Origin-Point` directory:

```bash
npm install
npm run dev
```

The development application runs at `http://localhost:3000` by default.

For a production build:

```bash
npm run build
npm start
```

The Supabase project, `profiles` table, redirect URLs, authentication providers, and SMTP settings must be configured before testing connected authentication features.
