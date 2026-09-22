"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
export interface Collaboration {
  id: string;
  opportunity_id: string;
  proposer_id: string;
  owner_id: string;
  proposer_name: string;
  proposer_organization: string;
  title: string;
  organization: string;
  objectives: string;
  deliverables: string;
  timeline: string;
  resources: string;
  terms: string;
  status: string;
  completion_requested_at: string | null;
  completed_at: string | null;
  created_at: string;
}
export interface CollaborationMilestone {
  id: string;
  proposal_id: string;
  title: string;
  criteria: string;
  due_on: string;
  status: string;
  feedback: string;
}
interface Update {
  id: string;
  proposal_id: string;
  author_name: string;
  milestone_id: string | null;
  message: string;
  evidence_url: string;
  created_at: string;
}
interface Event {
  id: string;
  proposal_id: string;
  actor_name: string;
  title: string;
  detail: string;
  created_at: string;
}
const KEY = "/api/collaborations";
export function useCollaborations() {
  const s = useSWR<{
    proposals: Collaboration[];
    milestones: CollaborationMilestone[];
    updates: Update[];
    events: Event[];
  }>(
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
export async function collaborationAction(
  name:
    | "submit_collaboration_proposal"
    | "decide_collaboration_proposal"
    | "add_collaboration_milestone"
    | "post_collaboration_update"
    | "review_collaboration_milestone"
    | "finish_collaboration",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  await mutate(KEY);
  await mutate("/api/notifications").catch(() => undefined);
}
