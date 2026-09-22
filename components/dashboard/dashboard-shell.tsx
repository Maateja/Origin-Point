"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";

import { RoleProvider } from "@/lib/role-context";

interface DashboardShellProps {
  role?: string;
  title?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  role = "student",
  title,
  children,
}: DashboardShellProps) {
  return (
    <RoleProvider defaultRole={role}>
      <div
        data-role={role}
        className="dashboard-frame min-h-screen bg-background"
      >
        <a href="#workspace-content" className="skip-navigation">
          Skip to workspace
        </a>
        {/* Sidebar (desktop) */}
        <Sidebar role={role} />

        {/* Main content area */}
        <div
          className={cn("dashboard-content-shell flex min-h-screen flex-col")}
        >
          <TopBar role={role} title={title} />
          <main
            id="workspace-content"
            tabIndex={-1}
            className="dashboard-main mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-8"
          >
            {children}
          </main>
        </div>

        <MobileBottomNav role={role} />
      </div>
    </RoleProvider>
  );
}
