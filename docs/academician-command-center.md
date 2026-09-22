# Faculty command center

The `/academician` dashboard uses existing platform, learning, application tracking, collaboration and `my_supervision` sources. No migration or external connection is required. All sources must load before counts appear; failed requests are not interpreted as zero activity.

Personal applications, accepted-and-started industry engagements, report-reviewed completions and learning enrollments are scoped to the current faculty account. Supervised students never enter personal development metrics. Completed learning is participation, not automatic verification of proficiency.

Faculty assignments are taken from the authenticated `my_supervision` RPC. Pending invitations on Offered applications, Accepted assignments with current access, and Accepted assignments without access are separate views. Accessible assignments can include completed engagements; the metric is deliberately not labelled active internships. Eligibility checks remain in existing database workflows.

Collaborations include only proposals where the faculty member is owner or proposer. Decision queues include only incoming Submitted proposals and completion requests on Accepted proposals owned by that faculty member. Saved Completed status plus completion timestamp establishes the completion metric.

Every metric shows supporting record IDs and links to existing workspaces. Personal internship tracking opens Applications, while the navigation link Industry internships opens opportunity discovery. Links do not preselect individual records. No automatic accept, approval, message, or data mutation is performed.

Sources refresh independently every 30 seconds, so this is an operational snapshot, not an atomic audit report. Tests use synthetic in-memory fixtures only. Live authenticated/browser checks remain necessary: compare counts against each workspace; check pending versus accepted supervision and membership loss; confirm only proposal owners see decision queues; test mobile and keyboard navigation.
