import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificatePrint } from "@/components/platform/certificate-print";
import styles from "./certificate.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private completion certificate",
  robots: { index: false, follow: false },
};
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: c, error } = await db
    .from("internship_certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(
      "Certificate could not be loaded. Confirm the certificate migration is applied and retry.",
    );
  if (!c) notFound();
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <p>
          This page is private. Refresh to check current status before relying
          on a saved copy.
        </p>
        <CertificatePrint />
      </div>
      <article className={styles.paper}>
        <header className={styles.header}>
          <span>ORIGIN ∞ POINT</span>
          <strong>{c.revoked_at ? "REVOKED" : "ISSUED RECORD"}</strong>
        </header>
        <p className={styles.eyebrow}>Academia–Industry Collaboration</p>
        <h1>
          Certificate of
          <br />
          reviewed completion
        </h1>
        <p className={styles.label}>Issued to</p>
        <h2>{c.recipient_name}</h2>
        <p>For the report-reviewed completion of</p>
        <h3>{c.title}</h3>
        <p className={styles.organization}>{c.organization}</p>
        {c.revoked_at && (
          <aside className={styles.revoked}>
            <strong>REVOKED · {date(c.revoked_at)}</strong>
            <p>{c.revocation_reason}</p>
            <p>This certificate must not be represented as active.</p>
          </aside>
        )}
        <dl className={styles.details}>
          <div>
            <dt>Agreed internship dates</dt>
            <dd>
              {date(c.start_on)} – {date(c.end_on)}
            </dd>
          </div>
          <div>
            <dt>Completion confirmed</dt>
            <dd>{date(c.completed_at)}</dd>
          </div>
          <div>
            <dt>Industry reviewer</dt>
            <dd>{c.industry_reviewer}</dd>
          </div>
          {c.faculty_reviewer && (
            <div>
              <dt>Faculty reviewer</dt>
              <dd>{c.faculty_reviewer}</dd>
            </div>
          )}
          <div>
            <dt>Confirmed by / issuing owner</dt>
            <dd>{c.issuer_name}</dd>
          </div>
          <div>
            <dt>Certificate issued</dt>
            <dd>{date(c.created_at)}</dd>
          </div>
        </dl>
        <footer className={styles.footer}>
          <p>Certificate ID: {c.id}</p>
          <p>Completion record: {c.completion_id}</p>
          <p>Approved final report: {c.report_id}</p>
          <p>Private verification path: /certificates/{c.id}</p>
          <p>Status checked: {new Date().toISOString()}</p>
          <p>
            This records approval by platform accounts, not independent
            accreditation, an e-signature, or a government-issued credential.
            Agreed dates are not a verified attendance period. Printed copies
            cannot prove current status; authorized viewers must revisit this
            record.
          </p>
        </footer>
      </article>
    </main>
  );
}
