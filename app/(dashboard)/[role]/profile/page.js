// @ts-nocheck
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  MapPin,
  Save,
  Sparkles,
  UserRound,
  Loader2,
  GraduationCap,
  BookOpen,
  Calendar,
  Plus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const roleConfig = {
  student: {
    label: "Student",
    title: "Build a profile employers remember",
    description: "Tell us what you are learning, building, and looking for next.",
    name: "",
    headline: "",
    location: "",
    bio: "",
    skills: ["React", "JavaScript", "Python", "SQL"],
  },
  industry: {
    label: "Industry",
    title: "Make your organisation discoverable",
    description: "Set up the details candidates need before they apply.",
    name: "",
    headline: "",
    location: "",
    bio: "",
    skills: ["Product", "Engineering", "Mentorship", "Hiring"],
  },
  academician: {
    label: "Academician",
    title: "Share your expertise with the right partners",
    description: "Create a profile for research, consultancy, and collaboration.",
    name: "",
    headline: "",
    location: "",
    bio: "",
    skills: ["Research", "Teaching", "AI", "Consultancy"],
  },
  institution: {
    label: "Institution",
    title: "Give your institution a clear presence",
    description: "Add the details that help partners and students connect with you.",
    name: "",
    headline: "",
    location: "",
    bio: "",
    skills: ["Placements", "Analytics", "Partnerships", "Student Success"],
  },
};

export default function ProfilePage({ params }) {
  const role = params?.role || "student";
  const config = roleConfig[role] || roleConfig.student;

  const [form, setForm] = useState({
    name: "",
    headline: "",
    location: "",
    bio: "",
    institution: "",
    department: "",
    academic_year: "",
  });

  const [userSkills, setUserSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const cachedName = localStorage.getItem("skillsync_user_name");
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 1. Fetch main profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, headline, location, bio")
            .eq("id", user.id)
            .maybeSingle();

          let studentData = null;
          if (role === "student") {
            // 2. Fetch student_profiles
            const { data: sp } = await supabase
              .from("student_profiles")
              .select("headline, bio, location, institution, department, academic_year, self_reported_skills")
              .eq("id", user.id)
              .maybeSingle();
            studentData = sp;
          }

          const currentName =
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            cachedName ||
            "";

          const currentHeadline =
            studentData?.headline ||
            profile?.headline ||
            "";

          const currentLocation =
            studentData?.location ||
            profile?.location ||
            "";

          const currentBio =
            studentData?.bio ||
            profile?.bio ||
            "";

          setForm({
            name: currentName,
            headline: currentHeadline,
            location: currentLocation,
            bio: currentBio,
            institution: studentData?.institution || "",
            department: studentData?.department || "",
            academic_year: studentData?.academic_year || "",
          });

          const loadedSkills =
            studentData?.self_reported_skills && studentData.self_reported_skills.length > 0
              ? studentData.self_reported_skills
              : config.skills;

          setUserSkills(loadedSkills);

          if (currentName) {
            localStorage.setItem("skillsync_user_name", currentName);
          }
        } else if (cachedName) {
          setForm((prev) => ({ ...prev, name: cachedName }));
          setUserSkills(config.skills);
        }
      } catch (e) {
        console.warn("Could not load profile:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [role, config.skills]);

  const updateField = (field, value) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddSkill = (e) => {
    e?.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !userSkills.includes(trimmed)) {
      setUserSkills((prev) => [...prev, trimmed]);
      setNewSkillInput("");
      setShowAddSkill(false);
      setSaved(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setUserSkills((prev) => prev.filter((s) => s !== skillToRemove));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (form.name?.trim()) {
        try {
          localStorage.setItem("skillsync_user_name", form.name.trim());
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Upsert into profiles
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: form.name.trim(),
            headline: form.headline.trim(),
            location: form.location.trim(),
            bio: form.bio.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        // 2. If student, upsert into student_profiles
        if (role === "student") {
          await supabase.from("student_profiles").upsert(
            {
              id: user.id,
              headline: form.headline.trim(),
              location: form.location.trim(),
              bio: form.bio.trim(),
              institution: form.institution.trim(),
              department: form.department.trim(),
              academic_year: form.academic_year.trim(),
              self_reported_skills: userSkills,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }

        // 3. Update auth metadata
        await supabase.auth.updateUser({
          data: { full_name: form.name.trim() },
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic profile completion score
  const completionChecks = [
    { label: "Basic information (Display name)", done: Boolean(form.name?.trim()) },
    { label: "Professional headline", done: Boolean(form.headline?.trim()) },
    { label: "Location", done: Boolean(form.location?.trim()) },
    { label: "About you / Bio", done: Boolean(form.bio?.trim()) },
    { label: "Skills & focus areas", done: userSkills.length > 0 },
    ...(role === "student"
      ? [{ label: "Academic Institution", done: Boolean(form.institution?.trim()) }]
      : []),
  ];

  const completedCount = completionChecks.filter((c) => c.done).length;
  const strengthPercent = Math.round((completedCount / completionChecks.length) * 100);

  return (
    <DashboardShell role={role} title="Profile">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl space-y-8 pb-16 pt-2"
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-2">
          <div>
            <Link
              href={`/${role}`}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] role-text">
              {config.label} profile
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              {config.title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              {config.description}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--role-gradient-from))] to-[hsl(var(--role-gradient-to))] text-white shadow-md hover:opacity-90 font-semibold cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Changes saved!" : isSaving ? "Saving..." : "Save profile"}
          </Button>
        </div>

        {/* Free, Airy Two-Column Grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          {/* Main Details Card */}
          <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs">
            <div className="h-28 role-gradient" />
            <CardHeader className="relative pb-6 pt-0 px-7 sm:px-8">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-card bg-card role-gradient text-3xl font-bold text-white shadow-lg">
                  <UserRound className="h-10 w-10" />
                </div>
              </div>
              <div className="mt-5">
                <CardTitle className="text-xl font-bold">Profile details</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Keep your personal and professional details current.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-7 sm:px-8 pb-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Display Name
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 rounded-xl"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Professional Headline
                  <Input
                    value={form.headline}
                    onChange={(event) => updateField("headline", event.target.value)}
                    placeholder="e.g. Frontend Developer & UI Designer"
                    className="h-11 rounded-xl"
                  />
                </label>
              </div>

              {/* Student-specific academic fields */}
              {role === "student" && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic Background
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Institution / College
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={form.institution}
                        onChange={(event) => updateField("institution", event.target.value)}
                        placeholder="e.g. IIT Bombay / BITS Pilani"
                        className="pl-10 h-10 rounded-xl bg-background"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Department / Major
                      </label>
                      <Input
                        value={form.department}
                        onChange={(event) => updateField("department", event.target.value)}
                        placeholder="e.g. Computer Science"
                        className="h-10 rounded-xl bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Academic Year
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={form.academic_year}
                          onChange={(event) => updateField("academic_year", event.target.value)}
                          placeholder="e.g. 3rd Year / 2026"
                          className="pl-9 h-10 rounded-xl bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label className="space-y-2 text-sm font-semibold block">
                Location
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 h-11 rounded-xl"
                    value={form.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </label>

              <label className="space-y-2 text-sm font-semibold block">
                About you / Bio
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  className="flex min-h-32 w-full resize-y rounded-xl border border-input bg-background p-4 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 leading-relaxed"
                  placeholder="Share a short introduction..."
                />
              </label>
            </CardContent>
          </Card>

          {/* Sidebar Cards */}
          <div className="space-y-6">
            {/* Dynamic Profile Strength */}
            <Card className="role-gradient-subtle rounded-3xl border border-border/60 shadow-xs">
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl role-bg-soft p-2.5 role-text shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Profile strength</CardTitle>
                    <CardDescription className="text-xs">
                      {strengthPercent === 100
                        ? "Profile complete! Priority matching unlocked"
                        : "Good progress — keep completing details"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <div className="flex items-end justify-between">
                  <span className="font-display text-4xl font-extrabold">
                    {strengthPercent}
                    <span className="text-base font-normal text-muted-foreground">%</span>
                  </span>
                  <span className="text-xs font-semibold role-text">
                    {completionChecks.length - completedCount > 0
                      ? `${completionChecks.length - completedCount} steps left`
                      : "All set!"}
                  </span>
                </div>
                <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-background/70">
                  <motion.div
                    className="h-full rounded-full role-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card className="rounded-3xl border border-border/60 shadow-xs">
              <CardHeader className="p-6">
                <CardTitle className="text-base font-bold">Setup Checklist</CardTitle>
                <CardDescription className="text-xs">
                  Profiles with complete details receive priority matches.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 space-y-3">
                {completionChecks.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                        step.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        step.done
                          ? "text-muted-foreground line-through font-normal text-xs"
                          : "text-foreground font-medium text-xs"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Interactive Skills Management */}
            <Card className="rounded-3xl border border-border/60 shadow-xs">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-base font-bold">Focus areas & skills</CardTitle>
                <CardDescription className="text-xs">
                  Saved skills power your diagnostic tests and matches.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {userSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {showAddSkill ? (
                  <form onSubmit={handleAddSkill} className="flex items-center gap-2 pt-1">
                    <Input
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      placeholder="Skill name (e.g. Next.js)"
                      className="h-8 text-xs rounded-lg"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-8 px-3 text-xs rounded-lg">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddSkill(false)}
                      className="h-8 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddSkill(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add skill
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardShell>
  );
}
