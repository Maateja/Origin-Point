"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Variants } from "framer-motion";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

// Course modules data (8 items => 2 rows of 4)
const courseModules = [
  {
    id: "c1",
    title: "Full-Stack Web Development",
    category: "Development",
    description: "Master Modern React, Next.js, REST & GraphQL APIs, and responsive UI design.",
  },
  {
    id: "c2",
    title: "Data Structures & Algorithms",
    category: "Computer Science",
    description: "Deep dive into trees, dynamic programming, graph algorithms, and complexity.",
  },
  {
    id: "c3",
    title: "Database Systems & SQL Mastery",
    category: "Data",
    description: "Learn relational schemas, indexing, query optimization, PostgreSQL, and Redis.",
  },
  {
    id: "c4",
    title: "Cloud Infrastructure & DevOps",
    category: "DevOps",
    description: "Hands-on containerization with Docker, Kubernetes, CI/CD pipelines, and AWS.",
  },
  {
    id: "c5",
    title: "System Design & Scalability",
    category: "Architecture",
    description: "Architect high-throughput, fault-tolerant microservices, CDNs, and message queues.",
  },
  {
    id: "c6",
    title: "Applied AI & Machine Learning",
    category: "AI / ML",
    description: "Build generative AI pipelines, neural networks, PyTorch workflows, and LLM apps.",
  },
  {
    id: "c7",
    title: "Cybersecurity & Web Defense",
    category: "Security",
    description: "Explore OWASP Top 10 vulnerabilities, penetration testing, cryptography, and auth.",
  },
  {
    id: "c8",
    title: "Operating Systems & Low-Level",
    category: "Computer Science",
    description: "Memory management, multi-threading, concurrency, IPC, and Linux kernel fundamentals.",
  },
];

// Assessment Topics data (8 items => 2 rows of 4)
const assessmentTopics = [
  {
    id: "dsa",
    title: "Programming & DSA",
    category: "Core Algorithms",
    description: "Arrays, hashing, trees, sorting, dynamic programming, and complexity analysis.",
  },
  {
    id: "web-dev",
    title: "Web Development",
    category: "Frontend & Backend",
    description: "DOM manipulation, React lifecycle, SSR, CSS layout models, APIs, and state.",
  },
  {
    id: "db-sql",
    title: "Database & SQL",
    category: "Data Systems",
    description: "Relational queries, indexes, ACID transactions, Normalization, and ORM usage.",
  },
  {
    id: "system-design",
    title: "System Design",
    category: "Architecture",
    description: "Scalability, load balancing, caching tiers, asynchronous pipelines, and CAP.",
  },
  {
    id: "ai-ml",
    title: "Artificial Intelligence & ML",
    category: "Intelligence",
    description: "Supervised learning, loss functions, tokenization, transformers, and model tuning.",
  },
  {
    id: "cloud-devops",
    title: "Cloud & DevOps",
    category: "Infrastructure",
    description: "Containers, orchestration, CI/CD pipelines, IAM permissions, and monitoring.",
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    category: "InfoSec",
    description: "Authentication protocols, encryption ciphers, network scanning, and defense.",
  },
  {
    id: "os-systems",
    title: "Operating Systems",
    category: "Low Level",
    description: "Process scheduling, virtual memory, paging, locks, race conditions, and sys-calls.",
  },
];

// Difficulty levels for selected assessment topic (4 blocks, no pass scores, no timers)
const difficultyLevels = [
  {
    id: "very-beginner",
    title: "Very Beginner",
    levelNumber: "Level 1",
    questions: 10,
    summary: "Essential terminology, basic syntax, fundamental rules, and straightforward concepts.",
    topicsCovered: ["Syntax & Basic Semantics", "Terminology & Definitions", "Basic Control Flow"],
  },
  {
    id: "beginner",
    title: "Beginner",
    levelNumber: "Level 2",
    questions: 10,
    summary: "Standard problem-solving, everyday data structures, idiomatic patterns, and logic.",
    topicsCovered: ["Core Data Structures", "Functional Methods", "Basic Error Handling"],
  },
  {
    id: "intermediate",
    title: "Intermediate",
    levelNumber: "Level 3",
    questions: 10,
    summary: "Real-world engineering scenarios, edge cases, debugging, and efficiency trade-offs.",
    topicsCovered: ["Algorithm Optimization", "Concurrency & State", "Integration Patterns"],
  },
  {
    id: "advanced",
    title: "Advanced",
    levelNumber: "Level 4",
    questions: 10,
    summary: "High-scale architectural questions, complex invariants, deep diagnostic problem sets.",
    topicsCovered: ["Deep Architectural Analysis", "Complex Edge Scenarios", "High-Scale Tradeoffs"],
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

export default function SkillAssessmentPage() {
  const router = useRouter();

  // Toggle between Course Modules and Assessment Modules
  const [activeTab, setActiveTab] = useState<"courses" | "assessments">("courses");

  // Selected assessment topic state (null = show all topics, object = show 4 levels)
  const [selectedTopic, setSelectedTopic] = useState<(typeof assessmentTopics)[0] | null>(null);

  // Track fully completed courses (starts at 0/10 and increments ONLY when a course is completed fully)
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);

  // Track verified assessment scores per topic
  const [assessmentScores, setAssessmentScores] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      // 1. Direct fully completed courses
      const savedCoursesRaw = localStorage.getItem("skillsync_completed_courses");
      let finished: string[] = [];
      if (savedCoursesRaw) {
        const parsed = JSON.parse(savedCoursesRaw);
        if (Array.isArray(parsed)) finished = parsed;
      }

      // 2. Clean any rogue assessment keys from completed_modules
      const savedModulesRaw = localStorage.getItem("skillsync_completed_modules");
      if (savedModulesRaw) {
        const parsedMods: string[] = JSON.parse(savedModulesRaw);
        if (Array.isArray(parsedMods)) {
          const cleaned = parsedMods.filter((k) => typeof k === "string" && !k.startsWith("assessment-"));
          if (cleaned.length !== parsedMods.length) {
            localStorage.setItem("skillsync_completed_modules", JSON.stringify(cleaned));
          }
          // A course with 8 modules is complete when all 8 are finished
          courseModules.forEach((c) => {
            const modsFinished = cleaned.filter((m) => m.startsWith(`${c.id}-`)).length;
            if (modsFinished >= 8 && !finished.includes(c.id)) {
              finished.push(c.id);
            }
          });
        }
      }

      setCompletedCourses(finished);

      // 3. Local assessment report
      const localReportRaw = localStorage.getItem("skillsync_latest_assessment_report");
      if (localReportRaw) {
        try {
          const rep = JSON.parse(localReportRaw);
          if (rep?.topicId && rep?.percentage !== undefined) {
            setAssessmentScores((prev) => ({ ...prev, [rep.topicId]: rep.percentage }));
          }
        } catch {}
      }
    } catch (e) {
      console.warn("Could not read completed courses from localStorage:", e);
    }

    // 4. Fetch live scores from Supabase student_profiles
    async function loadAssessmentScores() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: sp } = await supabase
            .from("student_profiles")
            .select("assessment_scores, latest_assessment")
            .eq("id", user.id)
            .maybeSingle();

          const scores: Record<string, number> = {};
          if (sp?.assessment_scores && typeof sp.assessment_scores === "object") {
            Object.assign(scores, sp.assessment_scores);
          }
          if (sp?.latest_assessment?.topicId && sp.latest_assessment.percentage !== undefined) {
            if (scores[sp.latest_assessment.topicId] === undefined) {
              scores[sp.latest_assessment.topicId] = sp.latest_assessment.percentage;
            }
          }
          if (Object.keys(scores).length > 0) {
            setAssessmentScores((prev) => ({ ...prev, ...scores }));
          }
        }
      } catch (err) {
        console.warn("Could not load assessment scores from Supabase:", err);
      }
    }
    loadAssessmentScores();
  }, []);

  // Dynamic course progress: starts at 0/8 and increments strictly when a course is fully completed
  const totalCourses = 8;
  const completedCount = completedCourses.length;
  const progressPercent = Math.min((completedCount / totalCourses) * 100, 100);
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Start Assessment: navigate to dedicated new page
  const handleStartAssessment = (topicId: string, levelId: string) => {
    router.push(`/student/assessment/take/${topicId}/${levelId}`);
  };

  return (
    <DashboardShell role="student" title="Skill Assessment">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 md:space-y-10"
      >
        {/* ========================================================================= */}
        {/* 1. HEADER: Clean, unboxed text directly on page with 0/10 circle on right */}
        {/* ========================================================================= */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
            {/* Left title and description (Normal text, no square box) */}
            <div className="max-w-xl space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Your Skill Assessment
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                Complete your modules to certify your skills, unlock your full Skill Report radar, and qualify for matched industry opportunities.
              </p>
            </div>

            {/* Right: Circular progress indicator with dynamic 0/10 inside circle */}
            <div className="flex-shrink-0 self-start sm:self-center">
              <div className="relative flex items-center justify-center p-2 rounded-full">
                <svg className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90 transform" viewBox="0 0 96 96">
                  {/* Background Track Circle */}
                  <circle
                    cx="48"
                    cy="48"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/40"
                    fill="transparent"
                  />
                  {/* Foreground Animated Progress Circle */}
                  <circle
                    cx="48"
                    cy="48"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700 ease-out"
                    fill="transparent"
                  />
                </svg>

                {/* Inside Circle: 0/10 (increments only when a course is completed fully) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                  <span className="font-display text-2xl font-extrabold text-foreground leading-none">
                    {completedCount}/{totalCourses}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 2. TAB SWITCHER: Course Modules <-> Assessment Modules                     */}
        {/* ========================================================================= */}
        <motion.div variants={itemVariants} className="flex items-center">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border/70 w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab("courses");
                setSelectedTopic(null);
              }}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                activeTab === "courses"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Course Modules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assessments")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                activeTab === "assessments"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Assessment Modules
            </button>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 3. CONTENT AREA (SWITCHING BETWEEN COURSE MODULES & ASSESSMENT MODULES)    */}
        {/* ========================================================================= */}
        <AnimatePresence mode="wait">
          {activeTab === "courses" ? (
            /* ===================================================================== */
            /* TAB 1: COURSE MODULES (Spacious Curved Blocks, NO "1/10 Done" badge)   */
            /* ===================================================================== */
            <motion.div
              key="courses-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">Course Modules</h2>
                <span className="text-xs text-muted-foreground font-medium">8 Tracks Available</span>
              </div>

              {/* 4 Spacious Curved Blocks Per Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {courseModules.map((course) => (
                  <div
                    key={course.id}
                    className="p-6 sm:p-7 rounded-3xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.68rem] uppercase font-bold tracking-wider text-muted-foreground">
                          {course.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link href={`/student/assessment/course/${course.id}`} className="w-full block">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-10 rounded-2xl font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                        >
                          View Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* ===================================================================== */
            /* TAB 2: ASSESSMENT MODULES (Headlines only in curved boxes)            */
            /* ===================================================================== */
            <motion.div
              key="assessments-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {!selectedTopic ? (
                /* 4.A: Initial Assessment Topics (Headlines only in spacious curved boxes) */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-foreground">Assessment Modules</h2>
                    <span className="text-xs text-muted-foreground font-medium">Select a domain to begin</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {assessmentTopics.map((topic) => {
                      const score = assessmentScores[topic.id];
                      const isCompleted = score !== undefined;
                      return (
                        <div
                          key={topic.id}
                          onClick={() => setSelectedTopic(topic)}
                          className="relative p-7 sm:p-8 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer border border-border/80 bg-card hover:border-primary/60 hover:shadow-md transition-all duration-300 min-h-[140px] group shadow-xs"
                        >
                          {isCompleted && (
                            <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-600 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              {score}%
                            </span>
                          )}
                          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                            {topic.title}
                          </h3>
                          {isCompleted ? (
                            <span className="text-[0.7rem] text-emerald-600 font-semibold mt-1">
                              Certified · Verified
                            </span>
                          ) : (
                            <span className="text-[0.7rem] text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                              10 Questions · 4 Levels
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 4.B: Selected Topic -> 4 Curved Blocks (NO pass scores, NO timers) */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {selectedTopic.title} Assessments
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs rounded-full gap-1.5 hover:bg-muted px-4"
                      onClick={() => setSelectedTopic(null)}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Topics
                    </Button>
                  </div>

                  {/* 4 Curved Blocks in a row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {difficultyLevels.map((lvl) => (
                      <div
                        key={lvl.id}
                        className="p-6 sm:p-7 rounded-3xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5"
                      >
                        <div className="space-y-2.5">
                          <h3 className="text-base font-bold text-foreground">
                            {lvl.title}
                          </h3>

                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {lvl.summary}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-2xl p-3">
                            <span>{lvl.questions} Questions</span>
                            <span className="font-medium text-foreground">{lvl.levelNumber}</span>
                          </div>

                          <Button
                            size="sm"
                            className="w-full text-xs h-10 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-xs font-semibold"
                            onClick={() => handleStartAssessment(selectedTopic.id, lvl.id)}
                          >
                            Start Assessment
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardShell>
  );
}
