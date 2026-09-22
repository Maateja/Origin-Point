# Connected industry learning programs — increment 8

Apply `supabase/migrations/202609220008_learning_programs.sql` once after increment 7 and refresh. No seed programs, ratings, accreditation badges, learner counts or invented providers are added.

## Professional publishing

Industry → Programs now provides a dedicated publishing form and program catalog. The publisher must save an organization in their profile; published company names are copied from that account rather than independently verified. Required sections include overview, format, audience, difficulty, skills, specific learning outcomes, curriculum/session outline, prerequisites, instructor/team, dates, time-zone-aware schedule text, commitment, location/delivery mode, capacity, fees/refund terms, credential terms, completion requirements and business contact.

Formats: Training, Workshop, Certification program, Mentorship and FDP. Certification programs use the existing Training opportunity type underneath so the existing skill-learning resource links remain compatible. Stating certification terms does not make the platform an accreditor or automatically generate a credential. No payment collection is implemented; fee terms are publisher information, and enrollment does not assert that payment has been made.

Published terms are immutable for a cohort. Owners can close enrollment without losing learner records. Material changes require a new cohort. Drafts, automatic session attendance, live classroom delivery, publisher organization verification, waitlists, payments, program editing and external certification-provider integrations are not included.

## Connected learning

- Student and Academician → Learning Programs: search real published cohorts, inspect outcomes and full program handbook, acknowledge terms, and enroll. Role/audience, deadline and capacity checks happen in PostgreSQL. An opportunity row lock serializes enrollment capacity checks; retries do not duplicate enrollments. Withdrawals release capacity but cannot be reactivated in this workflow.
- Student recommendations explain matching skills where the student's latest saved industry assessment is below the issuer's threshold. Missing assessments are not described as measured weaknesses. Completion never updates assessed proficiency; the student is directed to reassessment.
- After the start date, learners submit work summaries and HTTPS evidence links. External evidence links keep the hosting service's own access rules and are not private Supabase uploads. Learners must grant reviewer access and must not embed credentials or sensitive data.
- Publishers review the latest work submission, request changes, or confirm completion against their published criteria. Earlier submissions and feedback remain visible. Completion freezes learner work and appears in the portfolio as publisher-reviewed participation, not a verified skill or independent certificate.
- Approved institutions see members' enrollment status, submitted work and reviews, plus actual active/completed enrollment counts. They cannot review as the publisher. Enrollment alone never shares unrelated portfolio documents with industry.
- Existing Learning Plan resource links point to structured programs when available. New structured programs use enrollment, not recruitment applications. Older unstructured listings and their existing applications remain intact in Marketplace/FDPs and publisher opportunity management.

## Real-account smoke test after migration

1. Set the industry's real organization in Profile, then publish a complete program with accurate terms.
2. Check its brochure/card on desktop and mobile. Inspect every section before sharing it.
3. Enroll with an eligible student or faculty account and verify an ineligible role cannot join.
4. After the start date, submit work, request changes as publisher, resubmit and confirm completion.
5. Check the learner portfolio and approved institution's Learning Programs page. Confirm unrelated accounts cannot see the enrollment/work and no new verified skills or assessment scores were created.

Local database tests cover schema validation, publisher identity, audience eligibility, capacity, enrollment retries, isolation, independent recruitment protection, correction history, approval ownership, withdrawal and read-only completion. No test records are sent to your Supabase project. Browser/live Supabase checks still require the migration and real accounts.
