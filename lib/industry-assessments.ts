"use client";
import useSWR from "swr";
export interface IndustryQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  skillArea: string;
  category: "Technical" | "Aptitude" | "Soft skills";
}
export interface IndustryAssessment {
  id: string;
  owner_id: string;
  opportunity_id: string;
  title: string;
  summary: string;
  status: "Draft" | "Published";
  version: number;
  supersedes: string | null;
  passing_score: number;
  question_count: number;
  approved_by: string | null;
  published_at: string | null;
  created_at: string;
}
export interface AssessmentDefinition extends IndustryAssessment {
  questions: IndustryQuestion[];
}
export async function assessmentRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "The assessment request could not be completed.",
    );
  return result;
}
export function useIndustryAssessments() {
  const state = useSWR<{ assessments: IndustryAssessment[] }>(
    "/api/industry-assessments",
    assessmentRequest,
    { shouldRetryOnError: false, revalidateOnFocus: true },
  );
  return {
    data: state.data?.assessments,
    error: state.error?.message as string | undefined,
    loading: state.isLoading,
    refresh: state.mutate,
  };
}
