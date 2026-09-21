// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { OriginWordmark } from "@/components/shared/origin-logo";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(8, "Please confirm your password").max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkAuthSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        } else {
          // Listen for recovery event if token came through hash
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, currentSession) => {
              if (event === "PASSWORD_RECOVERY" || currentSession) {
                setHasSession(true);
              }
            },
          );
          return () => {
            authListener?.subscription?.unsubscribe();
          };
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setCheckingSession(false);
      }
    }

    checkAuthSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values) => {
    setIsLoading(true);
    setAuthError("");

    try {
      // 1. Update password in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        setAuthError(
          error.message || "Failed to update password. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      // 2. Also record update in profiles table
      if (data?.user?.id) {
        try {
          await supabase
            .from("profiles")
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.user.id);
        } catch (dbErr) {
          console.warn("Could not update profiles timestamp:", dbErr);
        }
      }

      setIsSuccess(true);
    } catch (err) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-shell flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="auth-form-card w-full max-w-md"
      >
        <Link href="/" className="mb-8 inline-flex">
          <OriginWordmark className="text-xl font-bold tracking-tight" />
        </Link>

        {isSuccess ? (
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h1 className="mb-2 font-display text-2xl font-bold">
              Password updated!
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
              Your password has been successfully updated in the database. You
              can now use your email and this new password to sign in anytime.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => router.push("/select-role")}
                className="auth-card-submit w-full h-11"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <Link
                href="/login"
                className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : !checkingSession && !hasSession ? (
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mb-2 font-display text-2xl font-bold">
              Invalid or Expired Link
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
              This password reset link is invalid or has expired. For security
              reasons, reset links can only be used once.
            </p>

            <Link
              href="/forgot-password"
              className="auth-card-submit w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl"
            >
              Request a New Link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>

            <h1 className="mb-2 font-display text-2xl font-bold tracking-tight">
              Create new password
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Enter and confirm your new password below.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-5">{authError}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="reset-password">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className="auth-card-input pl-9 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="reset-confirm">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    className="auth-card-input pl-9 pr-10"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="auth-card-submit w-full h-11"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating password…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Update Password
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
