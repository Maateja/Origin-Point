// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OriginWordmark } from "@/components/shared/origin-logo";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const sendResetEmail = async (targetEmail) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const email = targetEmail.trim().toLowerCase();
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAuthError(data.error || "Failed to generate recovery link. Please try again.");
        setIsLoading(false);
        return false;
      }

      setSubmittedEmail(email);
      setIsGoogleAccount(data.isGoogle || false);
      setIsSubmitted(true);
      startCountdown();
      return true;
    } catch (err) {
      setAuthError(err.message || "An unexpected error occurred. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (values) => {
    await sendResetEmail(values.email);
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isLoading) return;
    await sendResetEmail(submittedEmail);
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

        {isSubmitted ? (
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <KeyRound className="h-7 w-7" />
            </div>

            <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
            <p className="text-sm leading-relaxed text-muted-foreground mb-4">
              We sent a password recovery link to{" "}
              <strong className="text-foreground font-semibold">
                {submittedEmail}
              </strong>
              .
            </p>

            {isGoogleAccount && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                <strong>Google Account Detected:</strong> This account was originally registered via Google OAuth. The email link will let you create a password so you can sign in using both Google and email/password.
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card/60 p-4 text-xs space-y-2.5 mb-6">
              <div className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Open the email and follow its link to choose and save your new password. Check your spam folder if it does not appear shortly.</span>
              </div>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-5">{authError}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isLoading || resendCountdown > 0}
                className="w-full h-11 rounded-xl gap-2 font-medium"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : resendCountdown > 0 ? (
                  <span>Request another link in {resendCountdown}s</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Resend Email
                  </span>
                )}
              </Button>

              <Link
                href="/login"
                className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mb-2 font-display text-2xl font-bold tracking-tight">
              Forgot your password?
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Enter your account email below and we&apos;ll send a secure password reset
              link.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-5">{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="forgot-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="auth-card-input pl-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
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
                    Sending reset email…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Generate Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
