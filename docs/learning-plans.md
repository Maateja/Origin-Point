# Student learning plans — increment 3

Apply `supabase/migrations/202609220003_learning_goals.sql` after the taxonomy migration, then refresh. Only Learning Plan and institution learning summaries depend on this new table; the rest of the platform stays available if it is not yet installed.

Students can add personal goals or goals from the skill gaps of a real opportunity, link matching published training/workshops/mentorship, set dates, record progress/reflections and an evidence URL, and archive/restore goals. Linking a programme does not enroll the student; applications still use the marketplace.

Completion is explicitly self-reported. It requires a reflection, records a database-managed timestamp, and never creates assessment evidence or verified credentials. Reopening a goal clears its completion timestamp. Aliases cannot create duplicate active goals for the same target; an archived duplicate must remain archived until the newer goal is archived.

Students own their plans. Approved institutions can read them through the existing membership relationship. Recruiters and other students cannot read them. The schema grants no deletion or ownership/verification/timestamp editing to authenticated users.

Verification: `npm test` uses disposable local Postgres to exercise persistence, membership access, invalid resource links, duplicate goals, completion, reopening, archive/restore and unauthorized access. No live test data is inserted. After activation, save a goal with a real student account, reload, and check its approved institution's Students view. No employer program or completion record is fabricated when the catalogue is empty.

Next: richer application timelines and the internship lifecycle. External learning-provider enrollment, issuer certification and assigned faculty supervision are not part of this increment.
