"use client";

import { useState } from "react";
import { usePlatformData } from "@/lib/platform-store";
import { DataState } from "@/components/platform/primitives";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  getCourseDetails,
  CourseModuleItem,
  SubTopic,
} from "@/lib/courses-data";
import { cn } from "@/lib/utils";

// Authored resource links; no imported enrollments or provider completion claims.
function getCourseExternalResources(courseId: string) {
  return {
    referenceSites:
      courseId === "c1"
        ? [
            {
              name: "MDN Learn Web Development",
              description:
                "HTML, CSS, JavaScript, accessibility, and web development fundamentals.",
              url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
            },
          ]
        : [
            {
              name: "MIT OpenCourseWare: Introduction to Algorithms",
              description:
                "Open course materials covering data structures, algorithm design, and analysis.",
              url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
            },
          ],
  };
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId =
    typeof params?.courseId === "string" ? params.courseId : "c1";

  const course = getCourseDetails(courseId);

  // Active expanded module accordion (default expands module 1)
  const [expandedModuleId, setExpandedModuleId] = useState<string>("m1");

  const state = usePlatformData();
  if (!course) notFound();
  const resources = getCourseExternalResources(course.id);
  const progress =
    state.data?.progress.filter((p) => p.user_id === state.data?.profile.id) ??
    [];
  const isModuleCompleted = (modId: string) =>
    course.modules
      .find((m) => m.id === modId)
      ?.subTopics.every((s) =>
        progress.some(
          (p) =>
            p.course_id === course.id &&
            p.module_id === modId &&
            p.subtopic_id === s.id,
        ),
      ) ?? false;
  const completedCount = course.modules.filter((m) =>
    isModuleCompleted(m.id),
  ).length;
  const progressPercent = Math.round(
    (completedCount / course.totalModules) * 100,
  );
  if (state.loading || state.error)
    return (
      <DashboardShell role="student" title="Course">
        <DataState {...state} retry={state.refresh} />
      </DashboardShell>
    );

  // Divide modules into 4 distinct levels (2 modules per level)
  const levelGroups = [
    {
      id: "very-beginner",
      title: "Very Beginner",
      levelNumber: "Level 1",
      description:
        "Foundational concepts and terminology",
      modules: course.modules.filter(
        (m) => m.level === "very-beginner" || m.moduleNumber <= 2,
      ),
    },
    {
      id: "beginner",
      title: "Beginner",
      levelNumber: "Level 2",
      description:
        "Core techniques and guided practice",
      modules: course.modules.filter(
        (m) =>
          m.level === "beginner" ||
          (m.moduleNumber >= 3 && m.moduleNumber <= 4),
      ),
    },
    {
      id: "intermediate",
      title: "Intermediate",
      levelNumber: "Level 3",
      description:
        "Intermediate concepts and applied problem solving",
      modules: course.modules.filter(
        (m) =>
          m.level === "intermediate" ||
          (m.moduleNumber >= 5 && m.moduleNumber <= 6),
      ),
    },
    {
      id: "advanced",
      title: "Advanced",
      levelNumber: "Level 4",
      description:
        "Advanced topics and deeper practice",
      modules: course.modules.filter(
        (m) => m.level === "advanced" || m.moduleNumber >= 7,
      ),
    },
  ];

  return (
    <DashboardShell role="student" title={course.title}>
      <div className="space-y-12 max-w-5xl mx-auto pb-20 pt-2">
        {/* Navigation Back */}
        <div>
          <Link
            href="/student/assessment"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Skill Assessment
          </Link>
        </div>

        {/* Free, Open, Premium Course Header (No heavy boxed containers or empty voids) */}
        <div className="space-y-6 pt-1">
          <div className="space-y-3 max-w-3xl">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              {course.title}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Clean Inline Progress & Metadata Flow */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-6 border-b border-border/60">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <BookOpen className="h-4 w-4 text-primary" />{" "}
                {course.totalModules} Comprehensive Modules
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Award className="h-4 w-4 text-emerald-500" /> Practice Track
                Badges
              </span>
            </div>

            {/* Inline progress status */}
            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {completedCount} of {course.totalModules} completed
                  </span>
                  <span className="font-bold text-primary">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Divided by 4 Levels (Very Beginner, Beginner, Intermediate, Advanced) */}
        <div className="space-y-10">
          {levelGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              {/* Cohesive Level Tier Header */}
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    {group.levelNumber}
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    {group.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pl-0.5">
                  {group.description}
                </p>
              </div>

              {/* Modules inside this Level */}
              <div className="space-y-3.5">
                {group.modules.map((mod: CourseModuleItem) => {
                  const isExpanded = expandedModuleId === mod.id;
                  const completed = isModuleCompleted(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className={cn(
                        "rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs",
                        completed
                          ? "border-emerald-500/30 bg-card hover:border-emerald-500/50"
                          : "border-border/80 bg-card hover:border-primary/40",
                      )}
                    >
                      {/* Module Header */}
                      <div
                        onClick={() =>
                          setExpandedModuleId(isExpanded ? "" : mod.id)
                        }
                        className="p-5 flex items-center justify-between gap-5 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Smooth curved squircle number badge */}
                          <div
                            className={cn(
                              "h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs",
                              completed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : mod.moduleNumber < 10 ? (
                              `0${mod.moduleNumber}`
                            ) : (
                              `${mod.moduleNumber}`
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-base font-bold text-foreground truncate">
                                Module {mod.moduleNumber}: {mod.title}
                              </h3>
                              {completed && (
                                <Badge
                                  variant="outline"
                                  className="text-[0.65rem] rounded-full px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold"
                                >
                                  Completed
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {mod.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:inline-block font-medium">
                            {mod.subTopics.length} Sub-topics
                          </span>
                          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sub-topics Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <div className="border-t border-border/70 bg-muted/15 p-5 sm:p-7 space-y-4">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Sub-topics & Learning Modules:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {mod.subTopics.map((st: SubTopic) => (
                                  <div
                                    key={st.id}
                                    className="p-5 rounded-2xl border border-border/80 bg-card flex flex-col justify-between gap-4 hover:border-primary/50 hover:shadow-xs transition-all"
                                  >
                                    <div className="space-y-1.5">
                                      <h4 className="text-sm font-bold text-foreground leading-snug">
                                        {st.title}
                                      </h4>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        {st.duration} &bull; 10 Questions
                                      </span>
                                    </div>

                                    {/* Start Button with NO arrow mark */}
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs h-9 rounded-xl font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                    >
                                      <Link
                                        href={`/student/assessment/course/${course.id}/learn/${mod.id}/${st.id}`}
                                      >
                                        Start
                                      </Link>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* EXTERNAL LEARNING RESOURCES SECTION (Free, clean, topic-specific)          */}
        {/* ========================================================================= */}
        <div className="space-y-6 pt-4 border-t border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">
                External Learning Resources &amp; References
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Open study materials for {course.title}. These are external
              resources, not integrated certification providers.
            </p>
          </div>

          {/* Reference Portals: Direct destination links for selected course */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {resources.referenceSites.map((site, idx) => (
              <a
                key={idx}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/60 hover:shadow-sm transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {site.name}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {site.description}
                  </p>
                </div>
                <div className="text-xs font-semibold text-primary group-hover:underline">
                  Open on {site.name} &rarr;
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
