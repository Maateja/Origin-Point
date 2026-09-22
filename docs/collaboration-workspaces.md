# Industry–academia collaboration workspaces — increment 11

Apply `supabase/migrations/202609220011_collaboration_workspaces.sql` once after increment 10, then refresh. This adds private partnership records and integrates actual activity with the notification inbox. No example proposals are inserted.

## Workflow

Industry, Academician and Institution portals now have **Collaborations**. Publish a Research, Consultancy or Live Project opportunity with audience Academician or All using the existing publisher, then a partner can propose through **Explore open calls**. Eligible pairs are industry ↔ academician/institution, not two industry accounts or two academic accounts. The caller must be open and within its deadline. These are partnership proposals, not student recruitment applications; existing student workflows remain unchanged.

A proposal captures immutable objectives, deliverables, timeline, resource/budget assumptions and confidentiality/IP expectations. Account names and organizations are snapshots, not independently verified identities. One proposal per proposer/call is supported; withdrawal or decline cannot be reversed or resubmitted in this increment. The proposing account may withdraw while submitted; the call owner accepts or declines with an explanation. Both can discuss submitted/accepted proposals without changing the saved terms.

After acceptance, the owner defines milestones and acceptance criteria. Both parties post append-only progress/discussion updates. Milestone approval requires a linked HTTPS evidence URL posted by the proposer. New proposer updates linked to a milestone reset its approval and clear a pending completion request, preventing stale approval from carrying into revised delivery. Owner reviews record their feedback in decision history. Review changes also clear pending completion requests.

Completion requires at least one milestone and all milestones approved. The proposer requests completion; the owner confirms or returns for further work. Pending completion requests freeze addition of milestone scope. Confirmation makes the workspace read-only, preserving updates, reviews and dates. This is a participant-confirmed workflow outcome, not independent validation of research, commercial acceptance or ownership rights.

## Privacy and limitations

Only the proposing account and opportunity-owner account can read a workspace. Institution membership, internship supervision and participation in another partnership do not grant access. An institution must be a direct participant to access that partnership. Multi-person teams, invited co-investigators, delegated institution oversight and student project-team memberships are not included.

Notification text is generic; its private workspace link focuses the proposal. External evidence links retain the hosting service's access rules. Do not post data, IP or credentials you are not authorized to disclose. There is no automatic NDA, e-signature, legal agreement, payment processing, verified research credential, secure attachment upload or ownership transfer. Saved terms are expectations entered by the proposer, not platform-generated legal advice.

Published terms and milestone criteria cannot be edited/deleted in this increment. Discuss adjustments explicitly; use a new call for a materially different scope. Closing a published call stops new proposals but does not remove existing workspaces. Partnership counts are account-level, not proof of institution-wide agreements.

## Activation check

Use actual industry and faculty/institution accounts: publish an eligible call → submit a proposal → discuss and accept → owner adds milestone → proposer links evidence → owner approves → proposer requests completion → owner confirms. Check both notification inboxes, ensure a non-participant cannot read the workspace, and confirm student applications still behave unchanged. Database tests run against disposable local PostgreSQL; real-account browser checks remain after migration.
