"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
const KEY = "/api/notifications";
export interface Notification {
  id: string;
  category: string;
  title: string;
  href: string;
  created_at: string;
  read_at: string | null;
}
export function useNotifications() {
  const s = useSWR<{ items: Notification[]; unread: number }>(
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
export async function markNotificationsRead(id?: string) {
  const { error } = id
    ? await supabase.rpc("mark_notification_read", { notification: id })
    : await supabase.rpc("mark_all_notifications_read");
  if (error) throw new Error(error.message);
  await mutate(KEY);
}
