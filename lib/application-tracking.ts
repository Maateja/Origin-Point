"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface ApplicationEvent {
  id: string;
  application_id: string;
  actor_id: string | null;
  event_type: string;
  status: string;
  next_step: string;
  feedback: string;
  progress: number;
  created_at: string;
}
export interface Milestone {
  id: string;
  application_id: string;
  title: string;
  description: string;
  due_on: string | null;
  status: "Pending" | "Approved";
  feedback: string;
  reviewed_at: string | null;
  created_at: string;
}
export interface InternshipLog {
  id: string;
  application_id: string;
  milestone_id: string | null;
  author_id: string;
  week_ending: string;
  summary: string;
  evidence_url: string;
  created_at: string;
}
const KEY = "/api/application-tracking";
export interface Arrangement {
  id: string;
  application_id: string;
  start_on: string | null;
  end_on: string | null;
  response: "Pending" | "Accepted" | "Declined";
  responded_at: string | null;
}
export interface Supervisor {
  id: string;
  application_id: string;
  supervisor_id: string;
  assigned_by: string;
  kind: "Mentor" | "Faculty";
  status: string;
}
export interface InternshipReport {
  id: string;
  application_id: string;
  kind: "Progress" | "Final";
  title: string;
  summary: string;
  document_path: string;
  created_at: string;
}
export interface ReportReview {
  id: string;
  report_id: string;
  reviewer_name: string;
  review_role: string;
  decision: string;
  feedback: string;
  created_at: string;
}
export interface InternshipCompletion {
  id: string;
  application_id: string;
  report_id: string;
  applicant_id: string;
  confirmed_name: string;
  title: string;
  organization: string;
  start_on: string;
  end_on: string;
  industry_review_id: string;
  faculty_review_id: string | null;
  created_at: string;
  confirmed_by: string;
}
export interface InternshipCertificate {
  id: string;
  completion_id: string;
  application_id: string;
  recipient_name: string;
  issuer_name: string;
  title: string;
  organization: string;
  start_on: string;
  end_on: string;
  completed_at: string;
  report_id: string;
  industry_reviewer: string;
  faculty_reviewer: string | null;
  created_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}
export function useApplicationTracking() {
  const state = useSWR<{
    events: ApplicationEvent[];
    milestones: Milestone[];
    logs: InternshipLog[];
    arrangements: Arrangement[];
    supervisors: Supervisor[];
    reports: InternshipReport[];
    reviews: ReportReview[];
    completions: InternshipCompletion[];
    certificates: InternshipCertificate[];
  }>(
    KEY,
    async () => {
      const response = await fetch(KEY, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      return body;
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
export async function internshipAction(
  name:
    | "configure_internship"
    | "respond_internship_offer"
    | "assign_internship_supervisor"
    | "respond_supervision"
    | "review_internship_report"
    | "complete_reviewed_internship"
    | "issue_internship_certificate"
    | "revoke_internship_certificate",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  await mutate(KEY);
  await mutate("/api/supervision");
  if (name === "complete_reviewed_internship") await mutate("/api/platform");
}
export async function submitInternshipReport(
  app: string,
  kind: string,
  title: string,
  summary: string,
  file: File,
) {
  if (
    file.type !== "application/pdf" ||
    file.size > 10 * 1024 * 1024 ||
    !file.size
  )
    throw new Error("Choose a PDF up to 10 MB.");
  const signature = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (signature !== "%PDF-")
    throw new Error("This file does not appear to be a PDF.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const path = `${user.id}/${app}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("internship-reports")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabase.rpc("submit_internship_report", {
    app,
    report_kind: kind,
    report_title: title,
    report_summary: summary,
    path,
  });
  if (error)
    throw new Error(
      `The PDF uploaded but report submission failed: ${error.message}. Contact your administrator to clean up the unattached upload if needed.`,
    );
  await mutate(KEY);
}
export async function openInternshipReport(path: string) {
  const { data, error } = await supabase.storage
    .from("internship-reports")
    .createSignedUrl(path, 60, { download: true });
  if (error) throw new Error(error.message);
  window.location.assign(data.signedUrl);
}
export interface SupervisionInvitation {
  id: string;
  application_id: string;
  kind: string;
  status: string;
  application_status: ApplicationStatus;
  title: string;
  company: string;
  applicant_name: string;
  can_access: boolean;
}
type ApplicationStatus = "Offered" | "Completed";
export function useSupervision() {
  const state = useSWR<SupervisionInvitation[]>(
    "/api/supervision",
    async () => {
      const { data, error } = await supabase.rpc("my_supervision");
      if (error)
        throw new Error(
          "Supervision needs the latest database migration, or could not be loaded. Please retry.",
        );
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
export async function addMilestone(
  input: Pick<Milestone, "application_id" | "title" | "description" | "due_on">,
) {
  const { error } = await supabase
    .from("internship_milestones")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await mutate(KEY);
}
export async function reviewMilestone(
  id: string,
  status: Milestone["status"],
  feedback: string,
) {
  const { error } = await supabase
    .from("internship_milestones")
    .update({ status, feedback })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await mutate(KEY);
}
export async function addInternshipLog(
  input: Pick<
    InternshipLog,
    | "application_id"
    | "milestone_id"
    | "week_ending"
    | "summary"
    | "evidence_url"
  >,
) {
  const { error } = await supabase
    .from("internship_logs")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await mutate(KEY);
}
