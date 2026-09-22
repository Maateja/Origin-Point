"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface LearningProgram {
  id: string;
  format: string;
  level: string;
  starts_on: string;
  ends_on: string;
  schedule: string;
  prerequisites: string;
  outcomes: string[];
  curriculum: string[];
  instructor: string;
  fee_terms: string;
  credential_terms: string;
  completion_rules: string;
  contact: string;
  opportunity: {
    title: string;
    owner_id: string;
    company: string;
    audience: string;
    description: string;
    skills: string[];
    location: string;
    work_mode: string;
    duration: string;
    deadline: string;
    seats: number;
    status: string;
  };
}
export interface ProgramEnrollment {
  id: string;
  program_id: string;
  learner_id: string;
  learner_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}
export interface ProgramSubmission {
  id: string;
  enrollment_id: string;
  summary: string;
  evidence_url: string;
  created_at: string;
}
export interface ProgramReview {
  id: string;
  submission_id: string;
  reviewer_name: string;
  decision: string;
  feedback: string;
  created_at: string;
}
const KEY = "/api/learning-programs";
export function useLearningPrograms() {
  const state = useSWR<{
    programs: LearningProgram[];
    enrollments: ProgramEnrollment[];
    submissions: ProgramSubmission[];
    reviews: ProgramReview[];
  }>(
    KEY,
    async () => {
      const r = await fetch(KEY, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      return data;
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  return {
    data: state.data,
    loading: state.isLoading,
    error: state.error?.message as string | undefined,
    refresh: state.mutate,
  };
}
export async function programAction(
  name:
    | "publish_learning_program"
    | "enroll_learning_program"
    | "withdraw_program_enrollment"
    | "submit_program_work"
    | "review_program_work",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  await mutate(KEY);
  if (name === "publish_learning_program") await mutate("/api/platform");
}
