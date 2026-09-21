import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AssessmentRunner } from "@/components/platform/assessment-runner";
import { PageHeading } from "@/components/platform/primitives";
export default async function Page({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  if (!z.string().uuid().safeParse(assessmentId).success) notFound();
  return (
    <DashboardShell role="student" title="Industry assessment">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/student/industry-assessments"
          className="text-sm role-text"
        >
          ← All industry assessments
        </Link>
        <PageHeading
          eyebrow="Industry-defined requirements"
          title="Show what you know."
          description="One scored attempt per published version. Starting again resumes an unfinished attempt; selected answers are not saved until submission. Results contribute assessment-backed evidence, not certification."
        />
        <AssessmentRunner request={{ assessmentId }} industryMode />
      </div>
    </DashboardShell>
  );
}
