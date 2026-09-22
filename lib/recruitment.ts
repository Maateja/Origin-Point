"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface Interview {
  id: string;
  application_id: string;
  starts_at: string;
  duration_minutes: number;
  mode: string;
  location: string;
  instructions: string;
  status: string;
  response: string;
  response_note: string;
}
export interface PlacementOffer {
  id: string;
  application_id: string;
  title: string;
  organization: string;
  compensation: string;
  terms: string;
  joining_on: string;
  expires_at: string;
  response: string;
  employer_joined_at: string | null;
  applicant_joined_at: string | null;
}
const KEY = "/api/recruitment";
export function useRecruitment() {
  const s = useSWR<{ interviews: Interview[]; offers: PlacementOffer[] }>(
    KEY,
    async () => {
      const r = await fetch(KEY, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      return b;
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  return {
    data: s.data,
    loading: s.isLoading,
    error: s.error?.message as string | undefined,
    refresh: s.mutate,
  };
}
export async function recruitmentAction(
  name:
    | "schedule_application_interview"
    | "cancel_application_interview"
    | "respond_application_interview"
    | "issue_placement_offer"
    | "respond_placement_offer"
    | "withdraw_placement_offer"
    | "record_placement_joining",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  await Promise.all([
    mutate(KEY),
    mutate("/api/platform"),
    mutate("/api/application-tracking").catch(() => undefined),
  ]);
}
