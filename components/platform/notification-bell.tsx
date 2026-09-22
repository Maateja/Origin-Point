"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
export function NotificationBell({ role }: { role: string }) {
  const state = useNotifications();
  const unread = state.data?.unread ?? 0;
  return (
    <Link
      href={`/${role}/notifications`}
      className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted"
      aria-label={
        state.error
          ? "Notifications unavailable"
          : state.loading
            ? "Loading notifications"
            : `Notifications, ${unread} unread`
      }
      title={state.error ? "Notifications unavailable" : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {!!unread && !state.error && (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
      {state.error && (
        <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-500" />
      )}
    </Link>
  );
}
