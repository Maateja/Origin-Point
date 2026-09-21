// @ts-nocheck
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { OriginWordmark } from "@/components/shared/origin-logo";

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

// ─── Resend countdown hook ───────────────────────────────────────────────────
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step: 1 (Email) | 2 (Verify OTP & New Password) | 3 (Success)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState({ type: "", msg: "" });

  const { seconds, start: startTimer, canResend } = useResendTimer();

  // ── Step 1: Send Recovery OTP ──────────────────────────────────────────────
  const handleSendRecoveryOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setNotice({ type: "", msg: "" });

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, mode: "recovery" }),
      });
      const resData = await res.json();

      if (!res.ok || resData.error) {
        if (res.status === 404) {
          setErrorMessage("No account found with this email. Please check and try again.");
        } else {
          setErrorMessage(resData.error || "Failed to send reset code. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      setStep(2);
      startTimer();
      setNotice({
        type: "success",
        msg: `A 6-digit verification code has been sent to ${trimmed}`,
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Resend Recovery OTP ────────────────────────────────────────────
  const handleResendRecoveryOtp = async () => {
    if (!canResend || isLoading) return;
    setOtp("");
    setErrorMessage("");
    setNotice({ type: "", msg: "" });
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), mode: "recovery" }),
      });
      const resData = await res.json();

      if (!res.ok || resData.error) {
        setErrorMessage(resData.error || "Failed to resend code.");
      } else {
        startTimer();
        setNotice({
          type: "success",
          msg: "A new reset code has been sent to your email.",
        });
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to resend reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP and Reset Password ──────────────────────────────────
  const handleVerifyAndResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length < OTP_LENGTH) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verify OTP with type: 'recovery'
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "recovery",
      });

      if (otpError) {
        if (otpError.message?.toLowerCase().includes("expired")) {
          setErrorMessage("Verification code expired. Please request a new one.");
        } else if (otpError.message?.toLowerCase().includes("invalid")) {
          setErrorMessage("Incorrect code. Please double-check the 6 digits and try again.");
        } else {
          setErrorMessage(otpError.message || "Failed to verify code.");
        }
        setIsLoading(false);
        return;
      }

      // 2. Update user's password with the newly verified session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setErrorMessage(
          updateError.message || "Failed to update password. Please try again."
        );
        setIsLoading(false);
        return;
      }

      // 3. Mark timestamp in profiles
      if (data?.user?.id) {
        try {
          await supabase
            .from("profiles")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", data.user.id);
        } catch (dbErr) {
          console.warn("Could not update profile timestamp:", dbErr);
        }
      }

      setStep(3);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
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
          {/* ── STEP 1: Enter Email ──────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>

              <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">
                Reset your password
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Enter your account email. We&apos;ll send you a 6-digit verification
                code to reset your password.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-5">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSendRecoveryOtp} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="reset-email-input">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="auth-card-input pl-9"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage("");
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="auth-card-submit w-full h-11"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending code…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send Verification Code
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
            </motion.div>
          )}

          {/* ── STEP 2: Verify Code & Set Password ───────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-verify-reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMessage("");
                  setOtp("");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Change email
              </button>

              <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">
                Enter code &amp; new password
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground mb-1">
                Enter the 6-digit code sent to
              </p>
              <p className="font-semibold text-foreground text-sm mb-5">{email}</p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-5">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyAndResetPassword} noValidate className="space-y-4">
                {/* 6-box OTP */}
                <div className="space-y-1.5 pb-2">
                  <label className="text-sm font-medium block text-center">
                    Verification Code
                  </label>
                  <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="auth-card-input pl-9 pr-10"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="confirm-password">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      className="auth-card-input pl-9 pr-10"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                      <ShieldCheck className="h-4 w-4" />
                      Reset &amp; Set Password
                    </span>
                  )}
                </Button>
              </form>

              {/* Resend option */}
              <div className="mt-5 text-center text-sm text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendRecoveryOtp}
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
            </motion.div>
          )}

          {/* ── STEP 3: Success Screen ───────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h1 className="mb-2 font-display text-2xl font-bold">
                Password updated!
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                Your password has been successfully reset. You can now use your email
                and new password to log in directly without needing an OTP.
              </p>

              <Link
                href="/login"
                className="auth-card-submit w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl"
              >
                Sign In With New Password
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
