"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { OriginWordmark } from "@/components/shared/origin-logo";
import {
  GraduationCap,
  CalendarDays,
  Building2,
  BookOpen,
  Landmark,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Briefcase,
  Users,
  FileText,
  Target,
  FolderKanban,
  BookMarked,
  FlaskConical,
  Handshake,
  TrendingUp,
  PieChart,
  UserCheck,
  Building,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const roleIcons: Record<string, LucideIcon> = {
  student: GraduationCap,
  industry: Building2,
  academician: BookOpen,
  institution: Landmark,
};

const roleLabels: Record<string, string> = {
  student: "Student",
  industry: "Industry",
  academician: "Academician",
  institution: "Institution",
};

export const roleNavigation: Record<string, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    {
      label: "Recruitment Tracker",
      href: "/student/recruitment-tracker",
      icon: CalendarDays,
    },
    { label: "Learning Programs", href: "/student/programs", icon: BookMarked },
    {
      label: "Skill Assessment",
      href: "/student/assessment",
      icon: ClipboardCheck,
    },
    {
      label: "Industry Assessments",
      href: "/student/industry-assessments",
      icon: ClipboardCheck,
    },
    { label: "Career Readiness", href: "/student/readiness", icon: Target },
    {
      label: "Learning Plan",
      href: "/student/learning-plan",
      icon: BookMarked,
    },
    { label: "Skill Report", href: "/student/report", icon: BarChart3 },
    { label: "Portfolio", href: "/student/portfolio", icon: FileText },
    { label: "Marketplace", href: "/student/marketplace", icon: Briefcase },
    { label: "Applications", href: "/student/applications", icon: Target },
    {
      label: "Internship Tracking",
      href: "/student/internships",
      icon: FolderKanban,
    },
  ],
  industry: [
    { label: "Dashboard", href: "/industry", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/industry/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/industry/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Assigned Supervision",
      href: "/industry/supervision",
      icon: UserCheck,
    },
    {
      label: "Assessment Studio",
      href: "/industry/assessments",
      icon: ClipboardCheck,
    },
    { label: "Post Opportunity", href: "/industry/post", icon: Briefcase },
    { label: "Candidates", href: "/industry/candidates", icon: Users },
    { label: "Shortlisted", href: "/industry/shortlist", icon: FolderKanban },
    { label: "Programs", href: "/industry/programs", icon: BookMarked },
    {
      label: "Internship Tracking",
      href: "/industry/internships",
      icon: FolderKanban,
    },
  ],
  academician: [
    { label: "Dashboard", href: "/academician", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/academician/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/academician/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Learning Programs",
      href: "/academician/programs",
      icon: BookMarked,
    },
    {
      label: "Assigned Supervision",
      href: "/academician/supervision",
      icon: UserCheck,
    },
    { label: "FDPs", href: "/academician/fdps", icon: BookMarked },
    { label: "Consultancy", href: "/academician/consultancy", icon: Handshake },
    { label: "Research", href: "/academician/research", icon: FlaskConical },
    { label: "Internships", href: "/academician/internships", icon: Briefcase },
    {
      label: "My Applications",
      href: "/academician/applications",
      icon: Target,
    },
    {
      label: "Publish Collaboration",
      href: "/academician/publish",
      icon: Handshake,
    },
    { label: "Applicants", href: "/academician/candidates", icon: Users },
  ],
  institution: [
    { label: "Dashboard", href: "/institution", icon: LayoutDashboard },
    {
      label: "Collaborations",
      href: "/institution/collaborations",
      icon: Handshake,
    },
    {
      label: "Recruitment Tracker",
      href: "/institution/recruitment-tracker",
      icon: CalendarDays,
    },
    {
      label: "Learning Programs",
      href: "/institution/programs",
      icon: BookMarked,
    },
    { label: "Skill Analytics", href: "/institution/skills", icon: BarChart3 },
    { label: "Placement", href: "/institution/placement", icon: TrendingUp },
    { label: "Recruitment", href: "/institution/recruitment", icon: PieChart },
    { label: "Students", href: "/institution/students", icon: UserCheck },
    { label: "Departments", href: "/institution/departments", icon: Building },
    {
      label: "Internship Tracking",
      href: "/institution/internships",
      icon: FolderKanban,
    },
    {
      label: "Publish Collaboration",
      href: "/institution/publish",
      icon: Handshake,
    },
    { label: "Applicants", href: "/institution/candidates", icon: Users },
  ],
};

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role = "student" }: SidebarProps) {
  const pathname = usePathname();
  const navItems = [
    ...(roleNavigation[role] ?? roleNavigation.student),
    {
      label: "Profile & credentials",
      href: `/${role}/profile`,
      icon: Settings,
    },
  ];
  const RoleIcon = roleIcons[role] ?? GraduationCap;
  const roleLabel = roleLabels[role] ?? "Student";

  return (
    <aside
      className={cn(
        "dashboard-sidebar fixed bottom-0 left-0 top-0 z-50 w-64 flex-col border-r border-border bg-card",
      )}
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="overflow-hidden">
          <Link href="/" className="block">
            <OriginWordmark
              className="text-sm font-bold tracking-tight whitespace-nowrap"
              symbolClassName=""
            />
          </Link>
        </div>
      </div>

      {/* Role indicator pill */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 role-bg-soft transition-colors">
          <RoleIcon className="h-4 w-4 role-text flex-shrink-0" />
          <span className="text-xs font-medium role-text whitespace-nowrap">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        <p className="px-3 pb-2 pt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "role-bg-soft role-text"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: "hsl(var(--role-primary))" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    isActive
                      ? "role-text"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
