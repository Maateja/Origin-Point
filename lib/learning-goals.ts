"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface LearningGoal {
  id: string;
  user_id: string;
  skill: string;
  target_id: string | null;
  resource_id: string | null;
  status: "Planned" | "In progress" | "Completed";
  due_on: string | null;
  notes: string;
  evidence_url: string;
  archived: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
const KEY = "/api/learning-goals";
export function useLearningGoals() {
  const state = useSWR<LearningGoal[]>(
    KEY,
    async () => {
      const response = await fetch(KEY, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Unable to load learning goals.");
      return body;
    },
    { shouldRetryOnError: false, refreshInterval: 30000 },
  );
  return {
    data: state.data,
    loading: state.isLoading,
    error: state.error?.message as string | undefined,
    refresh: state.mutate,
  };
}
export async function createLearningGoal(
  input: Pick<LearningGoal, "skill"> & Partial<LearningGoal>,
) {
  const { error } = await supabase
    .from("learning_goals")
    .insert({
      skill: input.skill.trim(),
      target_id: input.target_id || null,
      resource_id: input.resource_id || null,
      due_on: input.due_on || null,
      notes: input.notes || "",
      evidence_url: input.evidence_url || "",
    })
    .select("id")
    .single();
  if (error)
    throw new Error(
      error.code === "23505"
        ? "You already have an active goal for this skill and target."
        : error.message,
    );
  await mutate(KEY);
}
export async function updateLearningGoal(
  id: string,
  input: Partial<LearningGoal>,
) {
  const fields = Object.fromEntries(
    (
      [
        "resource_id",
        "status",
        "due_on",
        "notes",
        "evidence_url",
        "archived",
      ] as const
    )
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key]]),
  );
  const { error } = await supabase
    .from("learning_goals")
    .update(fields)
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await mutate(KEY);
}
