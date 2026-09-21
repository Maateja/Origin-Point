"use client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RecordManager } from "@/components/platform/record-manager";
import { DataState, PageHeading } from "@/components/platform/primitives";
import { usePlatformData } from "@/lib/platform-store";
export default function PortfolioPage() {
  const state = usePlatformData();
  return (
    <DashboardShell role="student" title="Portfolio">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Your professional story"
          title="Proof of what you can do."
          description="A living portfolio of your skills, certificates, projects, and experiences."
        />
        <DataState {...state} retry={state.refresh} />
        {state.data && !state.error && <RecordManager data={state.data} />}
      </div>
    </DashboardShell>
  );
}
