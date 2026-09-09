// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { OriginWordmark } from "@/components/shared/origin-logo";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const VALID_ROLES = ["student", "industry", "academician", "institution"];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");
    if (errorParam) {
      if (errorParam === "auth_failed") {
        setAuthError("Authentication failed or expired. Please try signing in again.");
      } else {
        setAuthError(decodeURIComponent(errorParam));
      }
    }
    if (messageParam) {
      setSuccessNotice(decodeURIComponent(messageParam));
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (error) {
        // Helpful handling for Google OAuth users trying password login
        if (
          error.message?.toLowerCase().includes("invalid login credentials") ||
          error.code === "invalid_credentials"
        ) {
          setAuthError(
            "Invalid email or password. If you originally signed up using Google, please click the Google button below, or use 'Forgot password?' to create an email password."
          );
        } else {
          setAuthError(error.message || "Failed to sign in. Please check your credentials.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_completed")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.role && VALID_ROLES.includes(profile.role)) {
            if (profile.role === "student" && profile.onboarding_completed !== true) {
              router.push("/onboarding");
              return;
            }
            router.push(`/${profile.role}`);
            return;
          }
        } catch (profileErr) {
          console.warn("Could not fetch profile role:", profileErr);
        }

        // If no role has been chosen yet, direct to role picker
        router.push("/select-role");
      }
    } catch (err) {
      setAuthError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?mode=login`,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="auth-form-card w-full max-w-md"
    >
      {/* Logo */}
      <Link href="/" className="inline-flex items-center mb-8">
        <OriginWordmark className="text-xl font-bold" />
      </Link>

      <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Enter your credentials to access your dashboard.
      </p>

      {/* Success Notice */}
      {successNotice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Auth Error */}
      {authError && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-5">{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="login-email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email address"
              className="auth-card-input pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium" htmlFor="login-password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
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
          className="auth-card-submit w-full h-11"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign In
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      {/* Social login */}
      <div className="w-full">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleAuth}
          disabled={isLoading || isGoogleLoading}
          className="auth-card-outline h-11 w-full flex items-center justify-center gap-2"
        >
          {isGoogleLoading ? (
            <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          <span>Continue with Google</span>
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground hover:underline"
        >
          Create an account →
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page-shell min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse bg-muted rounded-3xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
