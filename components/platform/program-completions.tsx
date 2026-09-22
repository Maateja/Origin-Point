"use client";
import Link from "next/link";
import { useLearningPrograms } from "@/lib/learning-programs";
import { DataState, Tag } from "./primitives";
export function ProgramCompletions({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const state = useLearningPrograms();
  const completed =
    state.data?.enrollments.filter(
      (e) => e.learner_id === userId && e.status === "Completed",
    ) ?? [];
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Industry learning completions</h2>
      <DataState {...state} retry={state.refresh} />
      {completed.map((e) => {
        const p = state.data?.programs.find((p) => p.id === e.program_id);
        return (
          <Link
            key={e.id}
            href={`/${role}/programs?program=${e.program_id}`}
            className="glass-row block space-y-2 rounded-2xl p-5"
          >
            <Tag>Publisher-reviewed participation</Tag>
            <h3 className="font-semibold">{p?.opportunity.title}</h3>
            <p className="text-sm text-muted-foreground">
              {p?.opportunity.company} ·{" "}
              {e.completed_at &&
                new Date(e.completed_at).toLocaleDateString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              View submitted work and publisher feedback. This is not proof of
              skill proficiency or independent certification.
            </p>
          </Link>
        );
      })}
      {state.data && !state.error && !completed.length && (
        <p className="text-sm text-muted-foreground">
          No publisher-reviewed learning completions yet.
        </p>
      )}
    </section>
  );
}
