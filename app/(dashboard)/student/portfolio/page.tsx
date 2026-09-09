// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Share2, Download, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { supabase } from "@/lib/supabase/client";

const fallbackBadges = [
  { topicId: "web-dev",       title: "Web Developer",        level: "Proficient", color: "from-indigo-500 to-cyan-400",  earned: true },
  { topicId: "db-sql",        title: "SQL & Databases",      level: "Intermediate", color: "from-emerald-500 to-teal-400", earned: true },
  { topicId: "dsa",           title: "Programming & DSA",    level: "Advanced",     color: "from-amber-500 to-orange-400", earned: true },
  { topicId: "system-design", title: "System Architect",     level: "Beginner",     color: "from-violet-500 to-purple-400", earned: false },
];

const fallbackSkills = ["React", "JavaScript", "Python", "SQL", "Git", "REST APIs"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
} as const;

export default function PortfolioPage() {
  const [studentInfo, setStudentInfo] = useState({
    name: "Student",
    academicText: "Student Workspace",
    skills: fallbackSkills,
  });
  const [badges, setBadges] = useState(fallbackBadges);
  const [timeline, setTimeline] = useState([
    { type: "Education",   title: "Undergraduate Degree", org: "Enrolled Institution", date: "Current", verified: true },
    { type: "Assessment",  title: "Diagnostic Skill Assessment", org: "Origin Point",  date: "Recent",  verified: true },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          const { data: sp } = await supabase
            .from("student_profiles")
            .select("institution, department, academic_year, self_reported_skills, latest_assessment, assessment_scores, overall_skill_score, verified_skills")
            .eq("id", user.id)
            .maybeSingle();

          const resolvedName =
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Student";

          const parts = [
            sp?.department,
            sp?.institution,
            sp?.academic_year,
          ].filter(Boolean);

          const academicText = parts.length > 0 ? parts.join(" · ") : "Academic Profile in Progress";
          const resolvedSkills =
            sp?.self_reported_skills && sp.self_reported_skills.length > 0
              ? sp.self_reported_skills
              : fallbackSkills;

          setStudentInfo({
            name: resolvedName,
            academicText,
            skills: resolvedSkills,
          });

          // Dynamic badges from assessment_scores
          const scores = sp?.assessment_scores && typeof sp.assessment_scores === "object" ? sp.assessment_scores : {};
          if (sp?.latest_assessment?.topicId && sp.latest_assessment.percentage !== undefined) {
            if (scores[sp.latest_assessment.topicId] === undefined) {
              scores[sp.latest_assessment.topicId] = sp.latest_assessment.percentage;
            }
          }

          const dynamicBadges = [
            {
              topicId: "web-dev",
              title: "Web Development",
              level: scores["web-dev"] ? `${scores["web-dev"]}% (Proficient)` : "Not Tested",
              color: "from-indigo-500 to-cyan-400",
              earned: Boolean(scores["web-dev"] && scores["web-dev"] >= 50),
            },
            {
              topicId: "db-sql",
              title: "Database & SQL",
              level: scores["db-sql"] ? `${scores["db-sql"]}% (Intermediate)` : "Not Tested",
              color: "from-emerald-500 to-teal-400",
              earned: Boolean(scores["db-sql"] && scores["db-sql"] >= 50),
            },
            {
              topicId: "dsa",
              title: "Algorithms & DSA",
              level: scores["dsa"] ? `${scores["dsa"]}% (Advanced)` : "Not Tested",
              color: "from-amber-500 to-orange-400",
              earned: Boolean(scores["dsa"] && scores["dsa"] >= 50),
            },
            {
              topicId: "system-design",
              title: "System Design",
              level: scores["system-design"] ? `${scores["system-design"]}% (Practitioner)` : "Not Tested",
              color: "from-violet-500 to-purple-400",
              earned: Boolean(scores["system-design"] && scores["system-design"] >= 50),
            },
          ];
          setBadges(dynamicBadges);

          // Dynamic timeline entries
          const dynamicTimeline = [
            {
              type: "Education",
              title: sp?.department ? `${sp.department} Degree` : "Undergraduate Degree",
              org: sp?.institution || "Enrolled University",
              date: sp?.academic_year || "Current",
              verified: true,
            },
          ];

          if (sp?.latest_assessment) {
            const topic = sp.latest_assessment.topicId ? sp.latest_assessment.topicId.replace(/-/g, " ") : "Diagnostic";
            const dateStr = sp.latest_assessment.completedAt
              ? new Date(sp.latest_assessment.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Recent";
            dynamicTimeline.push({
              type: "Assessment",
              title: `Certified: ${topic.charAt(0).toUpperCase() + topic.slice(1)} Assessment`,
              org: `Origin Point · Score: ${sp.latest_assessment.percentage}%`,
              date: dateStr,
              verified: true,
            });
          } else {
            dynamicTimeline.push({
              type: "Assessment",
              title: "Diagnostic Skill Assessment",
              org: "Origin Point Evaluation",
              date: "Pending",
              verified: false,
            });
          }
          setTimeline(dynamicTimeline);
        }
      } catch (err) {
        console.warn("Could not load portfolio profile:", err);
      }
    }
    loadData();
  }, []);

  const initialLetter = (studentInfo.name || "S").trim().charAt(0).toUpperCase();

  return (
    <DashboardShell role="student" title="Portfolio">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Profile card */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-20 w-20 rounded-full role-gradient flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
                {initialLetter}
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold">{studentInfo.name}</h2>
                <p className="text-muted-foreground text-sm">{studentInfo.academicText}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {studentInfo.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[hsl(var(--role-gradient-from))] to-[hsl(var(--role-gradient-to))] text-white border-0 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Badges */}
          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Skill Badges</CardTitle>
                <CardDescription>Earned through verified assessments</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <div
                    key={badge.title}
                    className={`relative p-4 rounded-xl border text-center transition-all ${badge.earned ? "border-border hover:shadow-md" : "border-dashed border-muted-foreground/30 opacity-50"}`}
                  >
                    <div className={`h-12 w-12 mx-auto rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center mb-2 shadow-xs`}>
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs font-semibold">{badge.title}</p>
                    <p className="text-[0.6rem] text-muted-foreground">{badge.level}</p>
                    {!badge.earned && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline */}
          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle>Experience Timeline</CardTitle>
                <CardDescription>Your education, projects &amp; verified assessments</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="relative pl-6 space-y-7 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/80">
                  {timeline.map((entry) => (
                    <div key={entry.title} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-background bg-primary shadow-xs ring-4 ring-primary/10" />

                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">{entry.title}</h4>
                            {entry.verified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">{entry.org}</p>
                          <p className="text-xs text-muted-foreground/80">{entry.date}</p>
                        </div>

                        <Badge
                          variant="secondary"
                          className="self-start sm:self-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/50"
                        >
                          {entry.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </motion.div>
    </DashboardShell>
  );
}
