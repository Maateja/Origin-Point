"use client";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { type PlatformData } from "@/lib/platform-store";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "./primitives";
export function SkillPassport({
  data,
  userId = data.profile.id,
}: {
  data: PlatformData;
  userId?: string;
}) {
  const evidence = data.evidence
    .filter((e) => e.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!evidence.length)
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
        No industry assessment evidence recorded yet. Uploaded credentials and
        declared skills do not automatically become verified skills.
      </p>
    );
  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 role-text" />
          Assessment evidence
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Traceable scores from industry-authored, unproctored assessments. Not
          independent certification. Earlier results remain visible; readiness
          uses the latest evidence for each skill.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {evidence.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold">{e.skill}</h3>
                <Tag positive={e.score >= e.threshold}>
                  {e.score >= e.threshold
                    ? "Assessment-backed"
                    : "Below target"}
                </Tag>
              </div>
              <p className="mt-3 text-sm">
                <strong>{e.score}%</strong>
                <span className="text-muted-foreground">
                  {" "}
                  · employer target {e.threshold}% · {e.question_count} question
                  {e.question_count === 1 ? "" : "s"}
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Issuer:{" "}
                {data.directory.find((p) => p.id === e.issuer_id)
                  ?.organization ||
                  data.directory.find((p) => p.id === e.issuer_id)?.full_name ||
                  "Industry account"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recorded {new Date(e.created_at).toLocaleDateString("en-IN")}
              </p>
              {userId === data.profile.id && (
                <Link
                  href={"/student/report/" + e.assessment_report_id}
                  className="mt-3 inline-block text-xs font-semibold role-text"
                >
                  Inspect assessment result →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
