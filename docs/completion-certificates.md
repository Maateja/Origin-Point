# Private completion certificates — increment 7

Apply `supabase/migrations/202609220007_completion_certificates.sql` once after increment 6, then refresh. No external connection or new storage bucket is required.

The opportunity owner can issue a certificate from a report-reviewed completion in Internship Tracking. Students see it alongside completion evidence in their portfolio. Authorized institutions and supervisors can view it through the existing application access rules. Older employer-marked completions without reviewed evidence are not eligible.

Issuance snapshots the applicant's current saved name and the completion's organization, title, agreed dates, confirmation timestamp and actual reviewer names. One certificate exists per completion; retries do not duplicate it. The owner can permanently revoke it with a reason, but cannot overwrite or delete the historical record or reactivate it by issuing again. Corrected replacement certificates are not included in this increment.

The private `/certificates/[id]` page reads the database on each server request with the signed-in user's RLS permissions. Unknown and unauthorized IDs return not found. It includes record IDs, issue/status timestamps, revocation notices, and explicit limitations: account-issued evidence is not independent accreditation, an e-signature or a government credential. The dates are agreed dates, not a claim of verified attendance.

Use **Print / Save as PDF** to open the browser print dialog. This is a print-ready HTML certificate, not a server-generated PDF file stored in Supabase. Review the preview and choose Save as PDF if desired. Long names/titles may span more than one printed page. There are no public verification links or QR codes exposing personal information. Saved copies do not update after revocation; authorized viewers must revisit/refresh the private record to check live status.

After activation, test with real accounts: owner issues → student opens and saves PDF → unrelated account cannot open → owner revokes with reason → student refreshes and sees revoked status. Issuance and revocation do not change the underlying completion/report. Database tests use disposable local fixtures only; live authorization and browser print preview need checking after migration.
