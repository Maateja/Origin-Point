# Industry hiring command center

Available at `/industry`. Uses existing platform and recruitment APIs; no migration or external service is added. All production values derive from saved Supabase records. Synthetic fixtures exist only in automated tests.

Ownership is narrowed to opportunities published by the signed-in account, in addition to existing API RLS. An opportunity filter controls all metrics and supporting records. Application/interview counts include selected opportunity types; written offers and joining counts include Jobs only. These counts are not a cumulative conversion funnel.

Upcoming interviews must be Scheduled, not in the past, and attached to an application still Shortlisted or Interview Scheduled. They count schedules rather than candidates and do not prove attendance. Rescheduling requests are a subset of those upcoming schedules. Past requests remain available in recruitment history.

Written offers count actual saved offer rows, including declined/withdrawn/expired history, not legacy Offered or Completed application stages. Pending responses are split by actual response deadline. Joining requires Accepted plus both confirmation timestamps. Outstanding joining confirmations include future joining dates and are not labelled overdue. No workflow mutations, messages, or rejections run automatically.

Both sources must load successfully before metrics and export are available. Sources refresh independently every 30 seconds, so the snapshot is not transactionally synchronized. Export omits opportunity filter options, compensation, private files and offer terms. Supporting records link to relevant workspaces rather than individual preselected applications.

Verification: unit tests exercise ownership, empty accounts, filters, schedule eligibility, time-zone-aware deadlines, legacy stages, and joining requirements. Authenticated live browser verification remains necessary: compare an employer's dashboard to recruiter/student records, use each filter and queue, inspect export, check mobile and keyboard behavior, and confirm another employer's records remain inaccessible.
