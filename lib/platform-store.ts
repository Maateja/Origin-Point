"use client";

import useSWR, { mutate } from "swr";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export type Role = "student" | "industry" | "academician" | "institution";
export type OpportunityType =
  | "Internship"
  | "Job"
  | "Apprenticeship"
  | "Live Project"
  | "Training"
  | "Workshop"
  | "Mentorship"
  | "FDP"
  | "Faculty Internship"
  | "Consultancy"
  | "Research";
export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Offered"
  | "Rejected"
  | "Completed";
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  headline: string;
  location: string;
  bio: string;
  organization: string;
  department: string;
  program: string;
  graduation_year: number | null;
  website: string;
  interests: string[];
  discoverable: boolean;
}
export interface DirectoryPerson extends Partial<Profile> {
  id: string;
  full_name: string;
  role: Role;
  skills: string[];
}
export interface PortfolioRecord {
  id: string;
  user_id: string;
  kind:
    | "skill"
    | "certification"
    | "project"
    | "education"
    | "experience"
    | "achievement"
    | "document";
  title: string;
  organization: string;
  description: string;
  url: string;
  issued_on: string | null;
  expires_on: string | null;
  document_path: string | null;
  verified_at: string | null;
  created_at: string;
}
export interface Opportunity {
  id: string;
  ownerId: string;
  title: string;
  company: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  duration: string;
  type: OpportunityType;
  audience: "student" | "academician" | "all";
  stipend: string;
  deadline: string;
  skills: string[];
  description: string;
  seats: number;
  status: "Open" | "Closed";
  publishedAt: string;
  requiresAssessment?: boolean;
  assessmentCutoff?: number;
}
export interface Application {
  id: string;
  opportunityId: string;
  applicantId: string;
  studentName: string;
  appliedAt: string;
  matchScore: number;
  status: ApplicationStatus;
  nextStep: string;
  feedback: string;
  progress: number;
  updatedAt: string;
  assessmentReportId?: string | null;
  assessmentScore?: number | null;
  assessmentPassed?: boolean;
  proctoringTrust?: "Verified" | "Warnings Recorded" | "Disqualified";
  proctoringViolations?: number;
}
export interface Membership {
  id: string;
  institution_id: string;
  member_id: string;
  status: "Pending" | "Approved" | "Declined";
}
export interface Progress {
  user_id: string;
  course_id: string;
  module_id: string;
  subtopic_id: string;
  score: number;
}
export interface SkillEvidence {
  id: string;
  user_id: string;
  skill: string;
  score: number;
  threshold: number;
  question_count: number;
  issuer_id: string;
  assessment_report_id: string;
  industry_assessment_id: string;
  created_at: string;
}
export interface AssessmentReport {
  industryAssessmentId?: string | null;
  assessmentKind?: "industry" | "practice";
  targetPercent?: number;
  source?: string;
  id: string;
  userId?: string;
  topicId: string;
  topicTitle: string;
  levelId: string;
  levelTitle: string;
  date: string;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  evaluatedQuestions: Array<{
    id: number;
    question: string;
    options: string[];
    chosenAnswer: number;
    chosenText: string;
    correctAnswer: number;
    correctText: string;
    isCorrect: boolean;
    explanation: string;
    skillArea: string;
  }>;
  skillBreakdown: Array<{
    skill: string;
    score: number;
    benchmark: number;
    trend: "up" | "down" | "neutral";
  }>;
  gapRecommendations: Array<{
    gap: string;
    resource: string;
    priority: string;
  }>;
  disqualified?: boolean;
  disqualificationReason?: string;
  violations?: Array<{ type: string; reason: string; timestamp: string }>;
}
export interface PlatformData {
  profile: Profile;
  evidence: SkillEvidence[];
  directory: DirectoryPerson[];
  records: PortfolioRecord[];
  opportunities: Opportunity[];
  applications: Application[];
  savedOpportunityIds: string[];
  memberships: Membership[];
  reports: AssessmentReport[];
  progress: Progress[];
}
const KEY = "/api/platform";
async function fetchPlatform(): Promise<PlatformData> {
  const response = await fetch(KEY, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Could not load your workspace.");
  return body;
}
export function usePlatformData() {
  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<PlatformData>(KEY, fetchPlatform, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
    shouldRetryOnError: false,
  });
  return {
    data,
    error: error?.message as string | undefined,
    loading: isLoading,
    refresh,
  };
}
export function useAuthCacheBoundary() {
  useEffect(() => {
    let currentUser: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user?.id ?? null;
      if (currentUser !== undefined && nextUser !== currentUser) {
        void mutate(
          (key) =>
            typeof key === "string" &&
            ["/api/platform", "/api/industry-assessments"].includes(key),
          undefined,
          { revalidate: !!nextUser },
        );
      }
      currentUser = nextUser;
    });
    return () => data.subscription.unsubscribe();
  }, []);
}
export async function refreshPlatform() {
  await mutate(KEY);
}
export async function clearPlatformCache() {
  await mutate(
    (key) =>
      typeof key === "string" &&
      ["/api/platform", "/api/industry-assessments"].includes(key),
    undefined,
    { revalidate: false },
  );
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
async function userId() {
  const { data, error } = await supabase.auth.getUser();
  check(error);
  if (!data.user) throw new Error("Please sign in to continue.");
  return data.user.id;
}
export const nextStatuses: Record<ApplicationStatus, ApplicationStatus[]> = {
  Applied: ["Under Review", "Shortlisted", "Rejected"],
  "Under Review": ["Shortlisted", "Rejected"],
  Shortlisted: ["Interview Scheduled", "Offered", "Rejected"],
  "Interview Scheduled": ["Offered", "Rejected"],
  Offered: ["Completed"],
  Rejected: [],
  Completed: [],
};
export function getMatchScore(required: string[], candidate: string[] = []) {
  const skills = [...new Set(required.map(normaliseSkill).filter(Boolean))];
  if (!skills.length) return 0;
  const actual = new Set(candidate.map(normaliseSkill));
  return Math.round(
    (skills.filter((skill) => actual.has(skill)).length / skills.length) * 100,
  );
}
function normaliseSkill(skill: string) {
  return skill.trim().toLowerCase();
}
export function getMatchedSkills(required: string[], candidate: string[] = []) {
  return required.filter((s) =>
    candidate.some((c) => normaliseSkill(c) === normaliseSkill(s)),
  );
}
export function getMissingSkills(required: string[], candidate: string[] = []) {
  return required.filter(
    (s) => !candidate.some((c) => normaliseSkill(c) === normaliseSkill(s)),
  );
}
export function ownSkills(data?: PlatformData) {
  return (
    data?.records
      ?.filter((r) => r.user_id === data?.profile?.id && r.kind === "skill")
      ?.map((r) => r.title) ?? []
  );
}
export function isOpportunityOpen(opportunity: Opportunity) {
  return (
    opportunity.status === "Open" &&
    Date.now() <=
      new Date(opportunity.deadline + "T23:59:59.999+05:30").getTime()
  );
}
export async function saveProfile(input: Partial<Profile>) {
  const id = await userId();
  const editable = [
    "full_name",
    "headline",
    "location",
    "bio",
    "organization",
    "department",
    "program",
    "graduation_year",
    "website",
    "interests",
    "discoverable",
  ] as const;
  const fields = Object.fromEntries(
    editable
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key]]),
  );
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", id)
    .select("id")
    .single();
  check(error);
  await refreshPlatform();
}
export async function addRecord(
  input: Pick<PortfolioRecord, "kind" | "title"> & Partial<PortfolioRecord>,
  file?: File | null,
) {
  const id = await userId();
  let path: string | null = null;
  if (file) {
    if (
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      ) ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error("Choose a PDF, JPG, PNG, or WebP file up to 10 MB.");
    path =
      id +
      "/" +
      crypto.randomUUID() +
      "/" +
      file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const { error } = await supabase.storage
      .from("portfolio-documents")
      .upload(path, file);
    check(error);
  }
  const { error } = await supabase.from("portfolio_records").insert({
    user_id: id,
    kind: input.kind,
    title: input.title.trim(),
    organization: input.organization || "",
    description: input.description || "",
    url: input.url || "",
    issued_on: input.issued_on || null,
    expires_on: input.expires_on || null,
    document_path: path,
  });
  if (error && path)
    await supabase.storage.from("portfolio-documents").remove([path]);
  check(error);
  await refreshPlatform();
}
export async function removeRecord(record: PortfolioRecord) {
  const { error } = await supabase
    .from("portfolio_records")
    .delete()
    .eq("id", record.id)
    .eq("user_id", await userId())
    .select("id")
    .single();
  check(error);
  if (record.document_path) {
    const { error: storageError } = await supabase.storage
      .from("portfolio-documents")
      .remove([record.document_path]);
    if (storageError) {
      await refreshPlatform();
      throw new Error(
        "The record was deleted, but its file could not be removed from storage. Contact the administrator for file cleanup.",
      );
    }
  }
  await refreshPlatform();
}
export async function documentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("portfolio-documents")
    .createSignedUrl(path, 60);
  check(error);
  if (!data?.signedUrl) throw new Error("Could not open this document.");
  return data.signedUrl;
}
export async function createOpportunity(
  input: Omit<
    Opportunity,
    "id" | "ownerId" | "publishedAt" | "status" | "company"
  > & {
    attachedAssessment?: {
      title: string;
      summary: string;
      questions: any[];
      passingScore: number;
    };
  },
) {
  const id = await userId();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization, full_name")
    .eq("id", id)
    .single();
  check(profileError);
  const company = profile.organization?.trim() || profile.full_name?.trim();
  if (!company)
    throw new Error(
      "Save your organization name in your profile before publishing.",
    );
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      owner_id: id,
      company,
      title: input.title,
      type: input.type,
      audience: input.audience,
      location: input.location,
      work_mode: input.workMode,
      duration: input.duration,
      stipend: input.stipend,
      deadline: input.deadline,
      skills: input.skills,
      description: input.description,
      seats: input.seats,
      requires_assessment: !!input.requiresAssessment,
      assessment_cutoff: input.assessmentCutoff ?? 70,
    })
    .select("id")
    .single();
  check(error);

  // If an assessment was authored or generated with the opportunity, publish it
  if (input.requiresAssessment && input.attachedAssessment && data?.id) {
    try {
      const res = await fetch("/api/industry-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.attachedAssessment.title,
          summary: input.attachedAssessment.summary,
          opportunity_id: data.id,
          passing_score: input.attachedAssessment.passingScore || input.assessmentCutoff || 70,
          publish: true,
          questions: input.attachedAssessment.questions,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn("Failed to auto-publish assessment:", errJson.error);
      }
    } catch (err) {
      console.warn("Assessment publish error:", err);
    }
  }

  await refreshPlatform();
  return data;
}
export async function autoShortlistCandidates(opportunityId: string, minScore?: number) {
  const { data, error } = await supabase.rpc("auto_shortlist_candidates", {
    opportunity_id: opportunityId,
    min_score: minScore ?? null,
  });
  check(error);
  await refreshPlatform();
  return Number(data ?? 0);
}
export async function closeOpportunity(id: string) {
  const { error } = await supabase
    .from("opportunities")
    .update({ status: "Closed" })
    .eq("id", id)
    .select("id")
    .single();
  check(error);
  await refreshPlatform();
}
export async function toggleSavedOpportunity(id: string, saved: boolean) {
  const user = await userId();
  const result = saved
    ? await supabase
        .from("saved_opportunities")
        .delete()
        .eq("user_id", user)
        .eq("opportunity_id", id)
    : await supabase
        .from("saved_opportunities")
        .insert({ user_id: user, opportunity_id: id });
  check(result.error);
  await refreshPlatform();
}
export async function applyToOpportunity(id: string) {
  const { error } = await supabase.rpc("apply_to_opportunity", {
    opportunity: id,
  });
  check(error);
  await refreshPlatform();
}
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  nextStep?: string,
  feedback?: string,
  progress?: number,
) {
  const fields = {
    status,
    ...(nextStep !== undefined ? { next_step: nextStep } : {}),
    ...(feedback !== undefined ? { feedback } : {}),
    ...(progress !== undefined ? { progress } : {}),
  };
  const { error } = await supabase
    .from("applications")
    .update(fields)
    .eq("id", id)
    .select("id")
    .single();
  check(error);
  await refreshPlatform();
}
export async function requestMembership(institutionId: string) {
  const { error } = await supabase
    .from("institution_memberships")
    .insert({ institution_id: institutionId, member_id: await userId() });
  check(error);
  await refreshPlatform();
}
export async function reviewMembership(
  id: string,
  status: "Approved" | "Declined",
) {
  const { error } = await supabase
    .from("institution_memberships")
    .update({ status })
    .eq("id", id)
    .select("id")
    .single();
  check(error);
  await refreshPlatform();
}
export function exportRecords(filename: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
