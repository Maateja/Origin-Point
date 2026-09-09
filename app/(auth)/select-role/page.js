"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Building2,
  BookOpen,
  Landmark,
  ArrowRight,
  ShieldCheck,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import OptionWheel from "@/components/ui/OptionWheel";

/* ── Role data ───────────────────────────────────────────── */
const roleOptions = [
  {
    id: "student",
    label: "Student",
    subtitle: "Learners & Candidates",
    desc: "Assess your skills, build a verified portfolio and land high-impact internships.",
    features: [
      "AI Skill Diagnostics & Benchmarking",
      "Dynamic Career & Internship Matcher",
      "Cryptographically Verified Credential Hub",
    ],
    Icon: GraduationCap,
    accent: "#6366f1",        // indigo
    redirect: "/student",
  },
  {
    id: "industry",
    label: "Industry",
    subtitle: "Recruiters & Companies",
    desc: "Post opportunities, discover verified talent and streamline technical hiring.",
    features: [
      "AI-Powered Candidate Shortlisting",
      "Role-Specific Skill Gap Reports",
      "Direct Internship & Project Pipeline",
    ],
    Icon: Building2,
    accent: "#f59e0b",        // amber
    redirect: "/industry",
  },
  {
    id: "academician",
    label: "Academician",
    subtitle: "Faculty, Mentors & Guides",
    desc: "Drive FDPs, consultancy, research collaborations and student mentorship.",
    features: [
      "Student Skill Analytics & Progress",
      "Inter-College Research Matchmaking",
      "Faculty Development & Grant Tracking",
    ],
    Icon: BookOpen,
    accent: "#10b981",        // emerald
    redirect: "/academician",
  },
  {
    id: "institution",
    label: "Institution",
    subtitle: "Universities & Departments",
    desc: "Departmental intelligence, placement analytics and accreditation-ready data.",
    features: [
      "Real-time Placement Readiness Metrics",
      "Outcome-Based Curriculum Feedback",
      "NIRF / NAAC Data Alignment Hub",
    ],
    Icon: Landmark,
    accent: "#3b82f6",        // blue
    redirect: "/institution",
  },
];

const WHEEL_LABELS = roleOptions.map((r) => r.label);

/* ── Main page content ───────────────────────────────────── */
function SelectRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignupIntent = searchParams.get("intent") === "signup";
  const errorMessage = searchParams.get("error");

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const activeRole = roleOptions[selectedIndex];

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.role) {
            const idx = roleOptions.findIndex((r) => r.id === profile.role);
            if (idx !== -1) setSelectedIndex(idx);
          }
        } else {
          const savedRole = localStorage.getItem("selected_role");
          if (savedRole) {
            const idx = roleOptions.findIndex((r) => r.id === savedRole);
            if (idx !== -1) setSelectedIndex(idx);
          }
        }
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  const handleWheelChange = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  const handleConfirm = async () => {
    const roleId = activeRole.id;
    setIsSubmitting(true);
    try {
      localStorage.setItem("selected_role", roleId);
      document.cookie = `skillsync_role=${roleId}; path=/; max-age=31536000`;
    } catch { /* private mode */ }

    if (isSignupIntent || !currentUser) {
      router.push(`/signup?role=${roleId}`);
      return;
    }

    try {
      if (currentUser?.id) {
        await supabase.from("profiles").upsert(
          {
            id: currentUser.id,
            email: currentUser.email,
            full_name:
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              currentUser.email?.split("@")[0] ||
              "User",
            role: roleId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        await supabase.auth.updateUser({ data: { role: roleId } });
      }
      router.push(roleId === "student" ? "/onboarding" : activeRole.redirect || `/${roleId}`);
    } catch (err) {
      console.error("Failed to set role:", err);
      router.push(activeRole.redirect || `/${roleId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push("/login");
  };

  const { Icon, accent, subtitle, desc, features } = activeRole;

  return (
    /* Full-screen dark cinematic shell matching the landing page */
    <div
      className="min-h-screen w-full flex flex-col overflow-hidden"
      style={{ background: "hsl(201,100%,8%)", fontFamily: "'Inter', sans-serif", color: "#fff" }}
    >
      {/* ── Subtle animated gradient blob that follows the accent colour ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 60% 55% at 70% 50%, ${accent}22 0%, transparent 70%)`,
        }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="text-2xl tracking-tight text-white leading-none select-none"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Origin Point<sup className="text-xs text-white/50 ml-0.5">®</sup>
        </Link>

        {currentUser ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={15} strokeWidth={1.5} />
            Sign Out
          </button>
        ) : (
          <Link
            href="/login"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Log In
          </Link>
        )}
      </nav>

      {/* ── Error banner ── */}
      {errorMessage && (
        <div className="relative z-10 mx-auto max-w-xl w-full px-6 mt-2">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
            <AlertCircle size={16} className="shrink-0" />
            <span>{decodeURIComponent(errorMessage)}</span>
            <Link href="/login" className="ml-auto text-xs underline opacity-80 hover:opacity-100 shrink-0">
              Back to Login
            </Link>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="relative z-10 flex flex-1 items-center max-w-7xl mx-auto w-full px-6 md:px-12 py-10 gap-12">

        {/* LEFT — OptionWheel */}
        <div className="flex-1 flex flex-col justify-center" style={{ minHeight: 420 }}>
          {/* Tiny heading above the wheel */}
          <p className="text-xs tracking-widest uppercase text-white/35 mb-6 pl-1"
            style={{ fontFamily: "'Inter', sans-serif" }}>
            {isSignupIntent ? "Sign up as" : "Enter as"}
          </p>

          <OptionWheel
            items={WHEEL_LABELS}
            defaultSelected={selectedIndex}
            onChange={handleWheelChange}
            textColor="rgba(255,255,255,0.28)"
            activeColor="#ffffff"
            side="left"
            fontSize={3.8}
            spacing={1.35}
            curve={1}
            tilt={7}
            blur={2.5}
            fade={0.3}
            minOpacity={0.04}
            smoothing={180}
            inset={4}
            loop={false}
            draggable
          />
        </div>

        {/* RIGHT — Role detail card */}
        <div
          className="hidden md:flex flex-col justify-between rounded-3xl p-8 w-[400px] shrink-0 transition-all duration-500"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${accent}40`,
            boxShadow: `0 0 60px ${accent}18`,
            minHeight: 380,
          }}
        >
          {/* Icon + subtitle */}
          <div>
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500"
              style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
            >
              <Icon size={26} strokeWidth={1.4} style={{ color: accent }} />
            </div>

            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full mb-3 inline-block transition-colors duration-500"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}
            >
              {subtitle}
            </span>

            <h2
              className="text-3xl font-normal mb-3 transition-all duration-300"
              style={{ fontFamily: "'Instrument Serif', serif", color: "#fff" }}
            >
              {activeRole.label}
            </h2>

            <p className="text-sm leading-relaxed mb-7" style={{ color: "rgba(255,255,255,0.55)" }}>
              {desc}
            </p>

            {/* Feature list */}
            <div className="space-y-3">
              {features.map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <ShieldCheck size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  {feat}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingUser}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: accent,
              color: "#fff",
              boxShadow: `0 0 30px ${accent}55`,
            }}
          >
            {isSubmitting ? "Redirecting…" : isSignupIntent ? `Sign Up as ${activeRole.label}` : `Enter as ${activeRole.label}`}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Mobile CTA (below wheel on small screens) */}
        <div className="md:hidden fixed bottom-6 left-0 right-0 px-6 z-20">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingUser}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
            style={{ background: accent, color: "#fff" }}
          >
            {isSubmitting ? "Redirecting…" : `Continue as ${activeRole.label}`}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="relative z-10 text-center text-xs pb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
        Scroll · Drag · Arrow keys to navigate
      </p>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(201,100%,8%)", color: "#fff" }}>
        Loading…
      </div>
    }>
      <SelectRoleContent />
    </Suspense>
  );
}
