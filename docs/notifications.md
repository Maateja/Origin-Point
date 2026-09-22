# In-app notifications — increment 10

Apply `supabase/migrations/202609220010_notifications.sql` once after increment 9, then refresh. Every dashboard now has a bell linking to that role's private notification inbox. No external service connection is required.

Database triggers notify relevant accounts about application/timeline changes (including recruitment and offer actions), internship logs, milestones, reports/reviews, supervision invitations/revocations, certificate issuance/revocation, program enrollments/work/reviews, and institution membership requests/status changes. Recipient selection uses the current owner/applicant, accepted supervisors where relevant, and currently approved institutions. The actor does not receive a notification for their own action. Append-only event IDs and unique recipient/event keys prevent duplicate delivery of the same source event. Real successive actions can legitimately produce multiple notices.

Notifications are created within the source transaction. A rolled-back workflow action cannot leave a committed notification. No historical activity is backfilled or invented. Failed workflow writes do not send notices. There are no deadline reminders or background time-based jobs in this increment.

The bell and inbox refresh every 30 seconds and on refocus. They use the same cache-clearing boundary as other private data when accounts change. The inbox displays the latest 100 items; its unread count includes all saved unread notifications. Mark all read affects all of the signed-in recipient's unread items, including older items outside the displayed 100. Individual mark-read is idempotent. Opening a workspace does not automatically mark the notice read.

Notification text deliberately omits applicant names, report contents, compensation, feedback bodies and meeting secrets. Most links lead to the relevant role workspace; learning program links focus the specific program. A notification grants no new permission: underlying record access is evaluated on opening. Generic historical notices remain after a relationship is revoked, but no subsequent relationship-scoped notices are delivered. Supervisors do not receive recruitment notices merely because they supervise an internship.

No client can insert, rewrite or delete notices. Read timestamps are changed only through recipient-scoped RPCs. Administrative retention/cleanup, a full archive beyond the latest 100, preferences, email, push, SMS, real-time websocket delivery and delivery guarantees outside the database are not included.

After activation: submit an application as a student → check the owner's bell → shortlist as owner → check student inbox → mark read → switch accounts and confirm isolation. Also test a program submission, supervision invitation and institution membership request. Existing data is unchanged and does not suddenly produce notifications. Automated tests use disposable local databases only; real-account UI checks remain after migration.
