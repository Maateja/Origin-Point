"use client";
import Link from "next/link";
import { usePlatformData } from "@/lib/platform-store";
import {
  useApplicationTracking,
  internshipAction,
  type InternshipCompletion,
} from "@/lib/application-tracking";
import { Button } from "@/components/ui/button";
import { Field, SaveButton, Tag, useAction } from "./primitives";

export function CertificateControls({
  completion,
}: {
  completion: InternshipCompletion;
}) {
  const tracking = useApplicationTracking();
  const platform = usePlatformData();
  const action = useAction();
  const certificate = tracking.data?.certificates.find(
    (c) => c.completion_id === completion.id,
  );
  const owner = platform.data?.profile.id === completion.confirmed_by;
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h4 className="font-semibold">Completion certificate</h4>
      {action.feedback}
      {certificate ? (
        <>
          <Tag positive={!certificate.revoked_at}>
            {certificate.revoked_at ? "Revoked" : "Issued"}
          </Tag>
          <p className="break-all text-xs text-muted-foreground">
            Certificate ID: {certificate.id}
          </p>
          <Link
            className="inline-block text-sm font-semibold role-text"
            href={`/certificates/${certificate.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open private certificate & print / save PDF →
          </Link>
          {certificate.revoked_at && (
            <p className="text-sm">
              Revocation reason: {certificate.revocation_reason}
            </p>
          )}
          {owner && !certificate.revoked_at && (
            <details>
              <summary className="cursor-pointer text-sm">
                Revoke certificate
              </summary>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const reason = String(
                    new FormData(e.currentTarget).get("reason"),
                  );
                  if (
                    window.confirm(
                      "Permanently revoke this certificate? The historical record remains and cannot be reissued in this workflow.",
                    )
                  )
                    await action.run(
                      () =>
                        internshipAction("revoke_internship_certificate", {
                          certificate: certificate.id,
                          reason,
                        }),
                      "Certificate revoked.",
                    );
                }}
              >
                <Field label="Reason visible to authorized viewers">
                  <textarea
                    name="reason"
                    className="field"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </Field>
                <SaveButton busy={action.busy}>Revoke certificate</SaveButton>
              </form>
            </details>
          )}
        </>
      ) : owner ? (
        <Button
          disabled={action.busy}
          onClick={() => {
            if (
              window.confirm(
                "Issue a certificate using this reviewed completion and the applicant’s current saved name? Issued details cannot be edited.",
              )
            )
              void action.run(
                () =>
                  internshipAction("issue_internship_certificate", {
                    completion: completion.id,
                  }),
                "Certificate issued.",
              );
          }}
        >
          Issue completion certificate
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          The opportunity owner has not issued a certificate yet.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Private account-issued evidence, not independent accreditation. Saved
        copies do not update after revocation; check the live certificate for
        current status.
      </p>
    </section>
  );
}
