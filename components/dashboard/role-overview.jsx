"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FlaskConical,
  Handshake,
  MoreHorizontal,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const dashboardContent = {
  student: {
    greeting: "Good morning, Ananya",
    eyebrow: "Your career workspace",
    headline: "Turn your next skill into an opportunity.",
    description: "Three strong matches are waiting. Keep your profile fresh and let your verified skills do the talking.",
    primary: { label: "Explore matches", href: "/student/marketplace" },
    secondary: { label: "Continue assessment", href: "/student/assessment" },
    metrics: [
      { label: "Skill score", value: "74", suffix: "%", icon: Target },
      { label: "Applications", value: "5", icon: Briefcase },
      { label: "Courses done", value: "8", icon: CheckCircle2 },
      { label: "Profile strength", value: "74", suffix: "%", icon: Sparkles },
    ],
    queueTitle: "Best matches for you",
    queueDescription: "Opportunities ranked by your skill compatibility",
    filters: ["All", "Internship", "Fellowship"],
    items: [
      { title: "Frontend Developer Intern", company: "TechCorp India", meta: "Remote · 3 months", tags: ["React", "TypeScript"], score: "88%", filter: "Internship", icon: Briefcase, tone: "text-emerald-500" },
      { title: "Data Science Trainee", company: "AnalyticsPro", meta: "Bangalore · 6 months", tags: ["Python", "SQL"], score: "82%", filter: "Internship", icon: BarChart3, tone: "text-amber-500" },
      { title: "UX Design Fellow", company: "DesignHub", meta: "Mumbai · 4 months", tags: ["Figma", "Research"], score: "76%", filter: "Fellowship", icon: Sparkles, tone: "text-violet-500" },
    ],
    focusTitle: "Focus this week",
    focusDescription: "Small steps, visible progress",
    focus: [
      { label: "Finish your skill assessment", detail: "Unlock more accurate matches", href: "/student/assessment" },
      { label: "Add your latest project", detail: "Make your portfolio stand out", href: "/student/portfolio" },
      { label: "Save 3 opportunities", detail: "Build your shortlist for this week", href: "/student/marketplace" },
    ],
    insightTitle: "Your momentum",
    insightDescription: "You are building a strong week",
    insightValue: "+18%",
    insightDetail: "more profile activity than last week",
    activityTitle: "Recent activity",
    activity: ["Completed Web Development assessment", "Saved Data Science Trainee", "Added React to verified skills"],
  },
  industry: {
    greeting: "Good morning, Rohan",
    eyebrow: "Talent command center",
    headline: "Build a stronger pipeline, faster.",
    description: "Your next high-signal candidate may already be learning the exact skill your team needs.",
    primary: { label: "Post an opportunity", href: "/industry/post" },
    secondary: { label: "Review candidates", href: "/industry/candidates" },
    metrics: [
      { label: "Open opportunities", value: "12", icon: Briefcase },
      { label: "Matched candidates", value: "248", icon: Users },
      { label: "Shortlisted", value: "36", icon: FileCheck2 },
      { label: "Time to shortlist", value: "3.2", suffix: "d", icon: Clock3 },
    ],
    queueTitle: "Hiring signals",
    queueDescription: "The most promising candidates across your active roles",
    filters: ["All", "Frontend", "Data", "Design"],
    items: [
      { title: "Aarav Mehta", company: "Frontend Developer Intern", meta: "React · TypeScript · 2 years project work", tags: ["92% match", "Available"], score: "Top match", filter: "Frontend", icon: Users, tone: "text-emerald-500" },
      { title: "Meera Iyer", company: "Data Analyst Trainee", meta: "Python · SQL · Tableau", tags: ["87% match", "New today"], score: "Strong fit", filter: "Data", icon: BarChart3, tone: "text-amber-500" },
      { title: "Kabir Shah", company: "Product Design Fellow", meta: "Figma · User research · Prototyping", tags: ["81% match", "Portfolio ready"], score: "Good fit", filter: "Design", icon: Sparkles, tone: "text-violet-500" },
    ],
    focusTitle: "Team focus",
    focusDescription: "Keep your hiring motion moving",
    focus: [
      { label: "Review 8 new candidates", detail: "Your shortlist is waiting", href: "/industry/candidates" },
      { label: "Publish the campus brief", detail: "Reach 3 verified cohorts", href: "/industry/post" },
      { label: "Plan the next training sprint", detail: "Align skills with demand", href: "/industry/programs" },
    ],
    insightTitle: "Pipeline health",
    insightDescription: "Your hiring funnel is healthy",
    insightValue: "84%",
    insightDetail: "of active roles have a qualified match",
    activityTitle: "Team activity",
    activity: ["Shortlisted 4 candidates for Frontend Intern", "Published Data Foundations program", "Added a reviewer to the hiring workspace"],
  },
  academician: {
    greeting: "Good morning, Dr. Ananya",
    eyebrow: "Knowledge workspace",
    headline: "Turn expertise into visible impact.",
    description: "Connect your research, teaching, and industry work through one clear academic workspace.",
    primary: { label: "Explore collaborations", href: "/academician/research" },
    secondary: { label: "View your FDPs", href: "/academician/fdps" },
    metrics: [
      { label: "Active research", value: "6", icon: FlaskConical },
      { label: "FDP learners", value: "184", icon: BookOpen },
      { label: "Consultancy leads", value: "9", icon: Handshake },
      { label: "Impact score", value: "86", suffix: "%", icon: TrendingUp },
    ],
    queueTitle: "Collaboration opportunities",
    queueDescription: "Projects aligned with your expertise and current work",
    filters: ["All", "Research", "Consultancy", "FDP"],
    items: [
      { title: "Responsible AI in Education", company: "IIT Bombay · Research partner", meta: "Grant proposal · 4 collaborators", tags: ["AI ethics", "Open call"], score: "94% fit", filter: "Research", icon: FlaskConical, tone: "text-emerald-500" },
      { title: "Industry 4.0 Faculty Sprint", company: "TechCorp Learning", meta: "6-week FDP · Starts 18 Mar", tags: ["Mentorship", "Paid"], score: "88% fit", filter: "FDP", icon: BookOpen, tone: "text-amber-500" },
      { title: "Manufacturing Skills Audit", company: "Nova Manufacturing", meta: "Consultancy brief · Hybrid", tags: ["Priority", "New today"], score: "82% fit", filter: "Consultancy", icon: Handshake, tone: "text-violet-500" },
    ],
    focusTitle: "This week",
    focusDescription: "Keep your academic momentum",
    focus: [
      { label: "Reply to 3 consultancy leads", detail: "Keep partner conversations warm", href: "/academician/consultancy" },
      { label: "Share the research brief", detail: "Invite aligned collaborators", href: "/academician/research" },
      { label: "Review your FDP cohort", detail: "See learner progress", href: "/academician/fdps" },
    ],
    insightTitle: "Impact snapshot",
    insightDescription: "Your work is reaching further",
    insightValue: "2.4k",
    insightDetail: "learners and partners touched this term",
    activityTitle: "Recent activity",
    activity: ["Published Responsible AI research brief", "Reviewed 12 FDP learner submissions", "Received a new consultancy enquiry"],
  },
  institution: {
    greeting: "Good morning, Dr. Priya",
    eyebrow: "Institution command center",
    headline: "See readiness clearly. Act earlier.",
    description: "Bring skill progress, placement movement, and employer demand into one decision-ready view.",
    primary: { label: "Open skill analytics", href: "/institution/skills" },
    secondary: { label: "Review placements", href: "/institution/placement" },
    metrics: [
      { label: "Students tracked", value: "4,280", icon: Users },
      { label: "Placement readiness", value: "78", suffix: "%", icon: Target },
      { label: "Active employers", value: "126", icon: Building2 },
      { label: "Placement rate", value: "91", suffix: "%", icon: TrendingUp },
    ],
    queueTitle: "Signals that need attention",
    queueDescription: "A focused view of your institution's next best actions",
    filters: ["All", "Skills", "Placement", "Employers"],
    items: [
      { title: "Final-year readiness dip", company: "Computer Science · 142 students", meta: "React and SQL below target", tags: ["Action needed", "This week"], score: "-8 pts", filter: "Skills", icon: BarChart3, tone: "text-rose-500" },
      { title: "Spring placement drive", company: "42 employers · 318 openings", meta: "Shortlist review closes Friday", tags: ["On track", "High volume"], score: "72% done", filter: "Placement", icon: CalendarDays, tone: "text-amber-500" },
      { title: "New employer partnership", company: "Northstar Labs · 18 roles", meta: "Agreement ready for review", tags: ["New", "Priority"], score: "Ready", filter: "Employers", icon: Building2, tone: "text-emerald-500" },
    ],
    focusTitle: "Leadership focus",
    focusDescription: "Decisions for this week",
    focus: [
      { label: "Review the readiness dip", detail: "Assign a targeted learning sprint", href: "/institution/skills" },
      { label: "Approve placement shortlist", detail: "Keep the employer drive moving", href: "/institution/placement" },
      { label: "Welcome Northstar Labs", detail: "Complete the partnership setup", href: "/institution/recruitment" },
    ],
    insightTitle: "Institution pulse",
    insightDescription: "Your readiness trend is improving",
    insightValue: "+9%",
    insightDetail: "placement readiness since the last cohort",
    activityTitle: "Latest updates",
    activity: ["Published the March readiness report", "Added Northstar Labs as an employer", "Completed the Electronics cohort review"],
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export function RoleOverview({ role = "student" }) {
  const content = dashboardContent[role] || dashboardContent.student;
  const [filter, setFilter] = useState(content.filters[0]);
  const [saved, setSaved] = useState([]);
  const [userName, setUserName] = useState("");
  const [hasAttemptedAssessment, setHasAttemptedAssessment] = useState(false);
  const [studentStats, setStudentStats] = useState({
    skillScore: 0,
    assessmentsCount: 0,
    profileStrength: 75,
    department: "",
    institution: "",
    latestTopic: "",
    latestScore: 0,
    skills: [],
    onboardingDone: false,
  });

  useEffect(() => {
    // 1. Instant check from localStorage
    try {
      const cached = localStorage.getItem("skillsync_user_name");
      if (cached) setUserName(cached);

      const r1 = localStorage.getItem("skillsync_latest_assessment_report");
      const r2 = localStorage.getItem("skillsync_all_assessment_reports");
      const m = localStorage.getItem("skillsync_completed_modules");
      const c = localStorage.getItem("skillsync_completed_courses");
      const attempted = Boolean(
        r1 ||
        (r2 && JSON.parse(r2).length > 0) ||
        (m && JSON.parse(m).length > 0) ||
        (c && JSON.parse(c).length > 0)
      );
      setHasAttemptedAssessment(attempted);

      if (r1) {
        const parsedR1 = JSON.parse(r1);
        if (parsedR1?.percentage !== undefined) {
          setStudentStats((prev) => ({
            ...prev,
            skillScore: parsedR1.percentage,
            latestScore: parsedR1.percentage,
            latestTopic: parsedR1.topicId ? parsedR1.topicId.replace(/-/g, " ") : "Skill",
            assessmentsCount: Math.max(prev.assessmentsCount, 1),
          }));
        }
      }
    } catch {}

    // 2. Load from Supabase auth session, profiles, and student_profiles table
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, headline, location, bio, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();

          const resolved =
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0];

          if (resolved) {
            setUserName(resolved);
            try {
              localStorage.setItem("skillsync_user_name", resolved);
            } catch {}
          }

          if (role === "student") {
            const { data: sp } = await supabase
              .from("student_profiles")
              .select("institution, department, academic_year, self_reported_skills, career_goals, latest_assessment, assessment_scores, overall_skill_score, verified_skills")
              .eq("id", user.id)
              .maybeSingle();

            // Calculate profile strength
            let pScore = 0;
            if (profile?.full_name?.trim()) pScore += 15;
            if (profile?.headline?.trim()) pScore += 10;
            if (sp?.institution?.trim()) pScore += 20;
            if (sp?.department?.trim()) pScore += 15;
            if (sp?.academic_year?.trim()) pScore += 10;
            if (profile?.location?.trim()) pScore += 10;
            if (profile?.bio?.trim()) pScore += 10;
            if (sp?.self_reported_skills?.length > 0) pScore += 10;
            const strength = Math.min(pScore, 100);

            const scoresObj = sp?.assessment_scores && typeof sp.assessment_scores === "object" ? sp.assessment_scores : {};
            const scoresCount = Object.keys(scoresObj).length;
            const verifiedCount = Array.isArray(sp?.verified_skills) ? sp.verified_skills.length : 0;
            const effectiveAssessments = Math.max(scoresCount, verifiedCount, sp?.latest_assessment ? 1 : 0);

            const resolvedScore =
              sp?.overall_skill_score && sp.overall_skill_score > 0
                ? sp.overall_skill_score
                : sp?.latest_assessment?.percentage || 0;

            const latestAssess = sp?.latest_assessment;
            const isAttempted = Boolean(
              resolvedScore > 0 ||
              latestAssess ||
              effectiveAssessments > 0
            );

            if (isAttempted) {
              setHasAttemptedAssessment(true);
            }

            setStudentStats({
              skillScore: resolvedScore,
              assessmentsCount: effectiveAssessments,
              profileStrength: strength || 70,
              department: sp?.department || "",
              institution: sp?.institution || "",
              latestTopic: latestAssess?.topicId ? latestAssess.topicId.replace(/-/g, " ") : "",
              latestScore: latestAssess?.percentage || 0,
              skills: sp?.self_reported_skills || [],
              onboardingDone: Boolean(profile?.onboarding_completed),
            });
          }
        }
      } catch (e) {
        console.warn("Could not fetch user profile for dashboard:", e);
      }
    }

    loadUser();

    // Listen for storage events (in case name or assessment updated in another tab)
    const handleStorageChange = () => {
      try {
        const updated = localStorage.getItem("skillsync_user_name");
        if (updated) setUserName(updated);

        const r1 = localStorage.getItem("skillsync_latest_assessment_report");
        const r2 = localStorage.getItem("skillsync_all_assessment_reports");
        const m = localStorage.getItem("skillsync_completed_modules");
        const c = localStorage.getItem("skillsync_completed_courses");
        const attempted = Boolean(
          r1 ||
          (r2 && JSON.parse(r2).length > 0) ||
          (m && JSON.parse(m).length > 0) ||
          (c && JSON.parse(c).length > 0)
        );
        setHasAttemptedAssessment(attempted);

        if (r1) {
          const parsedR1 = JSON.parse(r1);
          if (parsedR1?.percentage !== undefined) {
            setStudentStats((prev) => ({
              ...prev,
              skillScore: parsedR1.percentage,
              latestScore: parsedR1.percentage,
              latestTopic: parsedR1.topicId ? parsedR1.topicId.replace(/-/g, " ") : "Skill",
              assessmentsCount: Math.max(prev.assessmentsCount, 1),
            }));
          }
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [role]);

  const visibleItems = useMemo(
    () => content.items.filter((entry) => filter === "All" || entry.filter === filter),
    [content.items, filter]
  );

  // Time-of-day greeting
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const firstName = userName ? userName.split(" ")[0] : "";
  const greetingDisplay = firstName ? `${timeGreeting}, ${firstName}` : `${timeGreeting}`;

  // Student dynamic metrics
  const displayMetrics = useMemo(() => {
    if (role !== "student") return content.metrics;
    return [
      {
        label: "Skill score",
        value: studentStats.skillScore > 0 ? String(studentStats.skillScore) : (hasAttemptedAssessment ? "70" : "—"),
        suffix: studentStats.skillScore > 0 || hasAttemptedAssessment ? "%" : "",
        icon: Target,
      },
      {
        label: "Applications",
        value: "5",
        icon: Briefcase,
      },
      {
        label: "Assessments done",
        value: String(Math.max(studentStats.assessmentsCount, hasAttemptedAssessment ? 1 : 0)),
        icon: CheckCircle2,
      },
      {
        label: "Profile strength",
        value: String(studentStats.profileStrength),
        suffix: "%",
        icon: Sparkles,
      },
    ];
  }, [role, content.metrics, studentStats, hasAttemptedAssessment]);

  // Student dynamic focus items
  const displayFocus = useMemo(() => {
    if (role !== "student") return content.focus;
    if (!hasAttemptedAssessment) {
      return [
        { label: "Take diagnostic skill assessment", detail: "Unlock your verified score and radar chart", href: "/student/assessment" },
        { label: "Complete your academic profile", detail: "Keep college, department, and bio updated", href: "/student/profile" },
        { label: "Explore matched opportunities", detail: "Browse curated roles for students", href: "/student/marketplace" },
      ];
    }
    return [
      {
        label: "View your assessment report",
        detail: studentStats.latestScore > 0
          ? `Scored ${studentStats.latestScore}% in ${studentStats.latestTopic || "assessment"} · Review breakdown`
          : "Review your detailed skill report and radar",
        href: "/student/report",
      },
      { label: "Explore skill-matched opportunities", detail: "Roles ranked according to your verified score", href: "/student/marketplace" },
      { label: "Review your verified portfolio", detail: "Showcase earned skill badges to recruiters", href: "/student/portfolio" },
    ];
  }, [role, content.focus, hasAttemptedAssessment, studentStats]);

  // Student dynamic activity feed
  const displayActivity = useMemo(() => {
    if (role !== "student") return content.activity;
    const acts = [];
    if (studentStats.latestTopic && studentStats.latestScore > 0) {
      acts.push(`Completed ${studentStats.latestTopic} assessment (${studentStats.latestScore}%)`);
    } else if (hasAttemptedAssessment) {
      acts.push("Completed diagnostic skill assessment");
    }
    if (studentStats.skills.length > 0) {
      acts.push(`Added ${studentStats.skills.slice(0, 3).join(", ")} to self-reported skills`);
    }
    if (studentStats.onboardingDone) {
      acts.push("Completed student onboarding profile");
    }
    if (acts.length === 0) {
      return content.activity;
    }
    return acts;
  }, [role, content.activity, studentStats, hasAttemptedAssessment]);

  // Eyebrow and headline
  const studentEyebrow = [studentStats.department, studentStats.institution].filter(Boolean).join(" · ") || content.eyebrow;
  const studentHeadline = hasAttemptedAssessment
    ? "Turn your verified skills into top opportunities."
    : content.headline;
  const studentDescription = hasAttemptedAssessment
    ? `Your skill score is certified. Keep taking domain assessments and explore matched roles in the talent marketplace.`
    : content.description;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="dashboard-page space-y-6">
      <motion.section variants={item} className="relative overflow-hidden rounded-[2rem] role-gradient p-6 text-white shadow-lg shadow-black/10 md:p-8">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/20" />
        <div className="absolute -right-4 top-10 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {role === "student" ? studentEyebrow : content.eyebrow}
          </div>
          <p className="mb-2 text-sm font-medium text-white/70">{greetingDisplay}</p>
          <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight md:text-4xl">
            {role === "student" ? studentHeadline : content.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            {role === "student" ? studentDescription : content.description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {role === "student" ? (
              hasAttemptedAssessment ? (
                <>
                  <Link href="/student/report">
                    <Button className="bg-white text-slate-950 shadow-lg hover:bg-white/90 font-semibold">
                      View skill report
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/student/assessment">
                    <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                      Take another assessment
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/student/assessment">
                    <Button className="bg-white text-slate-950 shadow-lg hover:bg-white/90 font-semibold">
                      Start skill assessment
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/student/marketplace">
                    <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                      Explore matches
                    </Button>
                  </Link>
                </>
              )
            ) : (
              <>
                <Link href={content.primary.href}>
                  <Button className="bg-white text-slate-950 shadow-lg hover:bg-white/90">
                    {content.primary.label}<ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={content.secondary.href}>
                  <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    {content.secondary.label}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.section>

      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {displayMetrics.map((metric) => <StatCard key={metric.label} {...metric} className="rounded-2xl" />)}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.7fr)]">
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="gap-4 border-b border-border/70 sm:flex-row sm:items-end sm:justify-between">
              <div><CardTitle>{content.queueTitle}</CardTitle><CardDescription>{content.queueDescription}</CardDescription></div>
              <div className="flex flex-wrap gap-1.5">
                {content.filters.map((option) => <button key={option} onClick={() => setFilter(option)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", filter === option ? "role-gradient border-transparent text-white" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground")}>{option}</button>)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {visibleItems.map((entry) => {
                const Icon = entry.icon;
                const isSaved = saved.includes(entry.title);
                return (
                  <motion.div key={entry.title} whileHover={{ y: -2 }} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-border/80 bg-background/60 p-4 transition hover:border-[hsl(var(--role-primary)/0.35)] hover:shadow-sm sm:gap-4">
                    <div className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted sm:flex", entry.tone)}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{entry.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">{entry.score}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{entry.company}</p><p className="mt-1 truncate text-xs text-muted-foreground">{entry.meta}</p><div className="mt-2 flex flex-wrap gap-1.5">{entry.tags.map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[0.65rem] text-muted-foreground">{tag}</span>)}</div></div>
                    <button aria-label={`${isSaved ? "Remove" : "Save"} ${entry.title}`} onClick={() => setSaved((current) => isSaved ? current.filter((name) => name !== entry.title) : [...current, entry.title])} className={cn("shrink-0 rounded-xl p-2 transition hover:bg-muted", isSaved ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}><Star className={cn("h-4 w-4", isSaved && "fill-current")} /></button>
                    <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground sm:block" />
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full role-gradient-subtle">
            <CardHeader><CardTitle>{content.focusTitle}</CardTitle><CardDescription>{content.focusDescription}</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {displayFocus.map((task, index) => <Link key={task.label} href={task.href} className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition hover:border-border hover:bg-background/70"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[0.65rem] font-semibold text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{task.label}</span><span className="mt-1 block text-xs text-muted-foreground">{task.detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" /></Link>)}
              <Link href={`/${role}/profile`} className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--role-primary)/0.35)] px-3 py-3 text-xs font-semibold role-text transition hover:bg-background/70"><Sparkles className="h-3.5 w-3.5" />Personalise your workspace</Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}><Card className="h-full"><CardHeader><div className="flex items-center justify-between"><div><CardTitle>{content.insightTitle}</CardTitle><CardDescription>{content.insightDescription}</CardDescription></div><Button variant="ghost" size="icon" aria-label="More insights"><MoreHorizontal className="h-4 w-4" /></Button></div></CardHeader><CardContent><div className="flex items-end justify-between gap-4"><div><p className="font-display text-4xl font-bold tracking-tight">{content.insightValue}</p><p className="mt-1 text-xs text-muted-foreground">{content.insightDetail}</p></div><div className="flex h-16 items-end gap-1.5">{[35, 48, 42, 61, 55, 75, 88].map((height, index) => <motion.span key={index} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: index * 0.05, duration: 0.5 }} className={cn("w-2.5 rounded-full", index === 6 ? "role-gradient" : "bg-muted")} />)}</div></div></CardContent></Card></motion.div>
        <motion.div variants={item}><Card className="h-full"><CardHeader><CardTitle>{content.activityTitle}</CardTitle><CardDescription>Small wins add up to meaningful progress</CardDescription></CardHeader><CardContent className="space-y-4">{displayActivity.map((entry, index) => <div key={entry} className="flex items-start gap-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full role-bg-soft"><CheckCircle2 className="h-4 w-4 role-text" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{entry}</p><p className="mt-1 text-xs text-muted-foreground">{index + 1} {index === 0 ? "hour" : "days"} ago</p></div></div>)}<Link href={`/${role}/profile`} className="flex items-center gap-1 text-xs font-semibold role-text">View workspace activity <ArrowRight className="h-3.5 w-3.5" /></Link></CardContent></Card></motion.div>
      </div>
    </motion.div>
  );
}
