// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Building2,
  BookOpen,
  Landmark,
  Check,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { OriginWordmark } from "@/components/shared/origin-logo";
import OptionWheel from "@/components/ui/OptionWheel";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const roleOptions = [
  {
    id: "student",
    label: "Student",
    subtitle: "Learners & Candidates",
    desc: "Assess skills, build verified portfolio & land high-impact internships.",
    features: [
      "AI Skill Diagnostics & Benchmarking",
      "Dynamic Career & Internship Matcher",
      "Cryptographically Verified Credential Hub",
    ],
    icon: GraduationCap,
    gradient: "from-indigo-500 to-cyan-400",
    badgeColor:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    redirect: "/onboarding",
  },
  {
    id: "industry",
    label: "Industry",
    subtitle: "Recruiters & Companies",
    desc: "Post opportunities, discover verified talent & streamline technical hiring.",
    features: [
      "AI-Powered Candidate Shortlisting",
      "Role-Specific Skill Gap Reports",
      "Direct Internship & Project Pipeline",
    ],
    icon: Building2,
    gradient: "from-amber-500 to-orange-400",
    badgeColor:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    redirect: "/industry",
  },
  {
    id: "academician",
    label: "Academician",
    subtitle: "Faculty, Mentors & Guides",
    desc: "Drive FDPs, consultancy, research collaborations & student mentorship.",
    features: [
      "Student Skill Analytics & Progress",
      "Inter-College Research Matchmaking",
      "Faculty Development & Grant Tracking",
    ],
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-400",
    badgeColor:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    redirect: "/academician",
  },
  {
    id: "institution",
    label: "Institution",
    subtitle: "Universities & Departments",
    desc: "Departmental intelligence, placement analytics & accreditation-ready data.",
    features: [
      "Real-time Placement Readiness Metrics",
      "Outcome-Based Curriculum Feedback",
      "NIRF / NAAC Data Alignment Hub",
    ],
    icon: Landmark,
    gradient: "from-blue-500 to-indigo-500",
    badgeColor:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    redirect: "/institution",
  },
];

const ROLE_ACCENTS = {
  student:     "#6366f1",
  industry:    "#f59e0b",
  academician: "#10b981",
  institution: "#3b82f6",
};
const WHEEL_LABELS = roleOptions.map((r) => r.label);

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1); // 1 = choose role, 2 = fill form
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signupSuccessMsg, setSignupSuccessMsg] = useState("");
  const [selectedRole, setSelectedRole] = useState("student");
  const [wheelIndex, setWheelIndex] = useState(0);

  useEffect(() => {
    const queryRole = searchParams.get("role");
    if (queryRole && roleOptions.some((r) => r.id === queryRole)) {
      setSelectedRole(queryRole);
      const idx = roleOptions.findIndex((r) => r.id === queryRole);
      if (idx !== -1) setWheelIndex(idx);
      setStep(2);
      try { localStorage.setItem("selected_role", queryRole); } catch {}
    } else {
      try {
        const saved = localStorage.getItem("selected_role");
        if (saved && roleOptions.some((r) => r.id === saved)) {
          setSelectedRole(saved);
          const idx = roleOptions.findIndex((r) => r.id === saved);
          if (idx !== -1) setWheelIndex(idx);
        }
      } catch {}
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    try {
      localStorage.setItem("selected_role", roleId);
      document.cookie = `skillsync_role=${roleId}; path=/; max-age=31536000`;
    } catch {}
    setStep(2);
  };

  const onSubmit = async (values) => {
    setIsLoading(true);
    setAuthError("");
    setSignupSuccessMsg("");

    const roleToAssign = selectedRole || "student";

    try {
      const normalizedEmail = values.email.trim().toLowerCase();
      const normalizedName = values.name.trim();

      // 1. Create user account via server endpoint (auto-confirms email and avoids SMTP failure)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password: values.password,
          role: roleToAssign,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        setAuthError(resData.error || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      try {
        localStorage.setItem("skillsync_user_name", normalizedName);
        localStorage.setItem("selected_role", roleToAssign);
        document.cookie = `skillsync_role=${roleToAssign}; path=/; max-age=31536000`;
      } catch {}

      // 2. Sign in with the created credentials immediately
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: values.password,
        });

      if (loginError) {
        setSignupSuccessMsg(
          "Account created successfully! Please click 'Log In' below to sign in."
        );
        setIsLoading(false);
        return;
      }

      if (loginData?.session) {
        const roleOption = roleOptions.find((r) => r.id === roleToAssign);
        router.push(roleOption?.redirect || `/${roleToAssign}`);
        return;
      }
    } catch (err) {
      setAuthError(err.message || "An unexpected error occurred during sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setAuthError("");
    const roleToAssign = selectedRole || "student";
    try {
      localStorage.setItem("selected_role", roleToAssign);
      document.cookie = `skillsync_role=${roleToAssign}; path=/; max-age=31536000`;
    } catch {}
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?mode=signup&role=${roleToAssign}`,
        },
      });
      if (error) {
        setAuthError(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setAuthError(err.message || "Failed to initiate Google sign in.");
      setIsGoogleLoading(false);
    }
  };

  const currentRoleInfo = roleOptions.find((r) => r.id === selectedRole);

  if (step === 2) {
    return (
      <div className="auth-page-shell min-h-screen flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="step-form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="auth-form-card w-full max-w-md"
          >
            {/* Origin Point Logo */}
            <Link href="/" className="inline-flex items-center mb-5">
              <OriginWordmark className="text-xl font-bold" />
            </Link>

            {/* Role Banner */}
            {currentRoleInfo && (
              <div className="mb-4 flex items-center justify-between p-2.5 rounded-xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-xs",
                      currentRoleInfo.gradient
                    )}
                  >
                    <currentRoleInfo.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Signing up as
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {currentRoleInfo.label}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline px-2 py-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Change
                </button>
              </div>
            )}

            <h1 className="font-display text-2xl font-bold mb-1">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm mb-5">
              {currentRoleInfo
                ? `Set up your ${currentRoleInfo.label} workspace on Origin Point.`
                : "Complete sign up to access your Origin Point workspace."}
            </p>

            {authError && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {signupSuccessMsg && (
              <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>{signupSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="signup-name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    placeholder="Enter your name"
                    className="auth-card-input pl-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="signup-email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="auth-card-input pl-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    className="auth-card-input pl-9 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="auth-card-submit w-full mt-1"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={isLoading || isGoogleLoading}
              className="auth-card-outline h-10 w-full flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Google
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Log In
              </Link>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Step 1: OptionWheel role selector — cinematic dark layout
  const activeRole = roleOptions[wheelIndex] || roleOptions[0];
  const accent = ROLE_ACCENTS[activeRole.id] || "#6366f1";
  const { icon: Icon, subtitle, desc, features } = activeRole;

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: "hsl(201,100%,8%)", fontFamily: "'Inter', sans-serif", color: "#fff" }}
    >
      {/* Ambient accent glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 60% 55% at 70% 50%, ${accent}22 0%, transparent 70%)` }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full shrink-0">
        <Link
          href="/"
          className="text-2xl tracking-tight text-white leading-none select-none"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Origin Point<sup className="text-xs text-white/50 ml-0.5">®</sup>
        </Link>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline font-medium">
            Log In
          </Link>
        </p>
      </nav>

      {/* Two-column layout */}
      <div className="relative z-10 flex flex-1 items-center max-w-7xl mx-auto w-full px-6 md:px-12 gap-12 overflow-hidden">

        {/* LEFT — OptionWheel */}
        <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
          <p className="text-xs tracking-widest uppercase mb-4 pl-1 shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>
            Sign up as
          </p>
          <div style={{ flex: 1, position: "relative" }}>
          <OptionWheel
            items={WHEEL_LABELS}
            defaultSelected={wheelIndex}
            onChange={(index) => {
              setWheelIndex(index);
              setSelectedRole(roleOptions[index].id);
            }}
            textColor="rgba(255,255,255,0.25)"
            activeColor="#ffffff"
            side="left"
            fontSize={3}
            spacing={1.4}
            curve={1}
            tilt={6}
            blur={2}
            fade={0.25}
            minOpacity={0.04}
            smoothing={200}
            inset={80}
            loop={false}
            draggable
          />
          </div>
        </div>

        {/* RIGHT — detail card */}
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
              className="text-3xl font-normal mb-3 mt-2 transition-all duration-300"
              style={{ fontFamily: "'Instrument Serif', serif", color: "#fff" }}
            >
              {activeRole.label}
            </h2>

            <p className="text-sm leading-relaxed mb-7" style={{ color: "rgba(255,255,255,0.55)" }}>
              {desc}
            </p>

            <div className="space-y-3">
              {features.map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <ShieldCheck size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  {feat}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleRoleSelect(activeRole.id)}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            style={{ background: accent, color: "#fff", boxShadow: `0 0 30px ${accent}55` }}
          >
            Continue as {activeRole.label}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Mobile CTA */}
        <div className="md:hidden fixed bottom-6 left-0 right-0 px-6 z-20">
          <button
            onClick={() => handleRoleSelect(activeRole.id)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{ background: accent, color: "#fff" }}
          >
            Continue as {activeRole.label}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <p className="relative z-10 text-center text-xs pb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
        Scroll · Drag · Arrow keys to navigate
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
          Loading registration...
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
