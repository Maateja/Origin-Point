import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeading } from "@/components/platform/primitives";
import { AssessmentRunner } from "@/components/platform/assessment-runner";
import { assessmentTopics, assessmentLevels } from "@/lib/assessment-catalog";
export default async function Page({
  params: pendingParams,
}: {
  params: Promise<{ topicId: string; levelId: string }>;
}) {
  const params = await pendingParams;
  if (!assessmentTopics[params.topicId] || !assessmentLevels[params.levelId])
    notFound();
  return (
    <DashboardShell role="student" title="Assessment">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeading
          eyebrow={assessmentLevels[params.levelId]}
          title={assessmentTopics[params.topicId]}
          description="Build an honest picture of your strengths. Scores reflect your answers to this assessment."
        />
        <AssessmentRunner request={params} />
      </div>
    </DashboardShell>
  );
}
