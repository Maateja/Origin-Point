// @ts-nocheck
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { OriginWordmark } from "@/components/shared/origin-logo";

const VALID_ROLES = ["student", "industry", "academician", "institution"];
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

// ─── 6-box OTP Input ─────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);

  const digits = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.split("");
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (e, index) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    // Support paste: spread characters across boxes
    const chars = raw.slice(0, OTP_LENGTH - index).split("");
    const next = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);
    chars.forEach((ch, i) => {
      if (index + i < OTP_LENGTH) next[index + i] = ch;
    });
    onChange(next.join(""));
    const focusIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          className={[
            "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background transition-all duration-150 outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            digit ? "border-primary/60 text-foreground" : "border-border text-muted-foreground",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-text",
          ].join(" ")}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Resend countdown ────────────────────────────────────────────────────────
function useResendTimer() {
  const [seconds, setSeconds] = useState(0);

  const start = () => setSeconds(RESEND_COOLDOWN);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return { seconds, start, canResend: seconds <= 0 };
}

// ─── Main Login Form ─────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", msg: "" });

  const { seconds, start: startTimer, canResend } = useResendTimer();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");
    if (errorParam) {
      if (errorParam === "auth_failed") {
        setNotice({ type: "error", msg: "Authentication failed or expired. Please try again." });
      } else {
        setNotice({ type: "error", msg: decodeURIComponent(errorParam) });
      }
    }
    if (messageParam) {
      setNotice({ type: "success", msg: decodeURIComponent(messageParam) });
    }
  }, [searchParams]);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setEmailError("");
    setNotice({ type: "", msg: "" });

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setEmailError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError("Please enter a valid email address"); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: false, // login only — don't create new accounts
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes("user not found") || error.status === 422) {
          setEmailError("No account found for this email. Please sign up first.");
        } else {
          setEmailError(error.message || "Failed to send code. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      setStep("otp");
      startTimer();
      setNotice({ type: "success", msg: `A 6-digit code was sent to ${trimmed}` });
    } catch (err) {
      setEmailError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setOtpError("");

    if (otp.replace(/\D/g, "").length < OTP_LENGTH) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "email",
      });

      if (error) {
        if (error.message?.toLowerCase().includes("expired")) {
          setOtpError("Code expired. Please request a new one.");
        } else if (error.message?.toLowerCase().includes("invalid")) {
          setOtpError("Incorrect code. Please check and try again.");
        } else {
          setOtpError(error.message || "Verification failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.role && VALID_ROLES.includes(profile.role)) {
            router.push(`/${profile.role}`);
            return;
          }
        } catch (profileErr) {
          console.warn("Could not fetch profile role:", profileErr);
        }
        router.push("/select-role");
      }
    } catch (err) {
      setOtpError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.replace(/\D/g, "").length === OTP_LENGTH && step === "otp") {
      handleVerifyOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleResend = async () => {
    if (!canResend) return;
    setOtp("");
    setOtpError("");
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (error) {
        setOtpError(error.message || "Failed to resend code.");
      } else {
        startTimer();
        setNotice({ type: "success", msg: "A new code has been sent to your email." });
      }
    } catch (err) {
      setOtpError(err.message || "Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setNotice({ type: "", msg: "" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?mode=login`,
        },
      });
      if (error) {
        setNotice({ type: "error", msg: error.message });
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setNotice({ type: "error", msg: err.message || "Failed to initiate Google sign in." });
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

      {/* Notice banners */}
      <AnimatePresence>
        {notice.msg && (
          <motion.div
            key={notice.type + notice.msg}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={[
              "mb-4 p-3 rounded-xl text-sm flex items-start gap-2.5",
              notice.type === "error"
                ? "bg-destructive/10 border border-destructive/20 text-destructive"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
            ].join(" ")}
          >
            {notice.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-5">{notice.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Email ──────────────────────────────────────────── */}
        {step === "email" && (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Enter your email and we&apos;ll send you a sign-in code.
            </p>

            <form onSubmit={handleSendOtp} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="login-email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    className="auth-card-input pl-9"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    disabled={isLoading}
                  />
                </div>
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="auth-card-submit w-full h-11"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending code…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue
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
                <span className="bg-background px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

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

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-foreground hover:underline">
                Create an account →
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: OTP ────────────────────────────────────────────── */}
        {step === "otp" && (
          <motion.div
            key="step-otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setOtpError(""); setNotice({ type: "", msg: "" }); }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h1 className="font-display text-2xl font-bold mb-1">Check your inbox</h1>
            <p className="text-muted-foreground text-sm mb-1">
              We sent a 6-digit code to
            </p>
            <p className="font-semibold text-foreground text-sm mb-7">{email}</p>

            <form onSubmit={handleVerifyOtp} noValidate className="space-y-6">
              <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />

              {otpError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-destructive text-center"
                >
                  {otpError}
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={isLoading || otp.replace(/\D/g, "").length < OTP_LENGTH}
                className="auth-card-submit w-full h-11"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Resend */}
            <div className="mt-5 text-center text-sm text-muted-foreground">
              Didn&apos;t receive it?{" "}
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend code
                </button>
              ) : (
                <span className="text-muted-foreground">
                  Resend in{" "}
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                    {String(seconds % 60).padStart(2, "0")}
                  </span>
                </span>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Code expires in 5 minutes
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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
