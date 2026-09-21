"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, UserRound, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";
import { clearPlatformCache, usePlatformData } from "@/lib/platform-store";
export function TopBar({
  role = "student",
  title,
  className = "",
}: {
  role?: string;
  title?: string;
  className?: string;
}) {
  const router = useRouter();
  const { data } = usePlatformData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logout = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    await clearPlatformCache();
    router.replace("/login");
    router.refresh();
  };
  return (
    <header
      className={
        "dashboard-top-bar sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl md:px-6 " +
        className
      }
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title || "Workspace"}</p>
        <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
          {role} workspace
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle className="" />
        <Link
          href={"/" + role + "/profile"}
          className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 hover:bg-muted"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full role-gradient text-xs font-bold text-white">
            {data?.profile.full_name?.charAt(0).toUpperCase() || (
              <UserRound className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="hidden max-w-40 truncate text-xs font-medium sm:block">
            {data?.profile.full_name || "Your profile"}
          </span>
        </Link>
        <button
          disabled={busy}
          onClick={logout}
          aria-label="Sign out"
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    </header>
  );
}
