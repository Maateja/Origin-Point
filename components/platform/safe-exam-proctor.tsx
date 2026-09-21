"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  Lock,
  Copy,
  Layers,
  XCircle,
  Eye,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ProctorViolation {
  type: string;
  reason: string;
  timestamp: string;
}

interface SafeExamContextType {
  strikes: number;
  maxStrikes: number;
  violations: ProctorViolation[];
  isFullscreen: boolean;
  isDisqualified: boolean;
  requestFullscreen: () => Promise<void>;
}

const SafeExamContext = createContext<SafeExamContextType | null>(null);

export function useSafeExam() {
  return useContext(SafeExamContext);
}

function playWarningSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio playback may be restricted if audio context is blocked
  }
}

/**
 * Pre-Exam Instruction & Honor Code Modal
 */
export function SafeExamInstructionsDialog({
  isOpen,
  onAcceptAndStart,
  onCancel,
  industryMode = false,
}: {
  isOpen: boolean;
  onAcceptAndStart: () => void;
  onCancel?: () => void;
  industryMode?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="max-w-xl border-border/80 bg-background shadow-2xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-1">
                <Lock className="h-3 w-3" /> Safe Exam Proctoring Protocol
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Proctored Assessment Regulations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {industryMode
                  ? "This industry assessment enforces strict anti-cheat monitoring to verify skill proficiency."
                  : "Standard proctoring protocol is enabled to ensure assessment integrity."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <Maximize2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Mandatory Fullscreen Mode</p>
                <p className="text-xs text-muted-foreground">
                  The assessment will launch into full-screen. Exiting full-screen mode at any point triggers a violation warning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <Layers className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Tab & Application Switching Prohibited</p>
                <p className="text-xs text-muted-foreground">
                  Switching browser tabs, minimizing the window, or moving focus to external applications is detected immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <Copy className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Clipboard & Anti-Copy Protection</p>
                <p className="text-xs text-muted-foreground">
                  Copying (Ctrl+C/Cmd+C), pasting, text selection, and right-clicking are disabled and flagged as violations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Strict 3-Strike Disqualification Policy
                </p>
                <p className="text-xs text-muted-foreground">
                  You are allowed up to 2 warning strikes. On the <strong>3rd warning</strong>, the assessment will be <strong>terminated immediately</strong> with a score of 0% and permanently locked against re-attempts.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="accept-honor-code"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs font-medium leading-5 text-foreground">
              I have read, understood, and agree to follow these Safe Exam regulations. I acknowledge that 3 violation strikes will result in permanent disqualification.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              disabled={!accepted}
              onClick={onAcceptAndStart}
              className="role-gradient border-0 text-white font-semibold px-6 shadow-md"
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Enter Safe Exam & Go Fullscreen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Top Proctoring Status Bar
 */
export function SafeExamStatusBar({
  strikes,
  maxStrikes = 3,
  isFullscreen,
  onRequestFullscreen,
}: {
  strikes: number;
  maxStrikes?: number;
  isFullscreen: boolean;
  onRequestFullscreen: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-3.5 px-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Safe Exam Mode Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isFullscreen && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onRequestFullscreen}
            className="h-7 text-xs font-medium animate-pulse"
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            Resume Fullscreen
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Violations:</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxStrikes }).map((_, i) => {
              const isViolated = i < strikes;
              return (
                <div
                  key={i}
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-all " +
                    (isViolated
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-muted text-muted-foreground/60 border border-border")
                  }
                  title={isViolated ? `Strike ${i + 1} recorded` : `Strike ${i + 1} clear`}
                >
                  {isViolated ? "!" : i + 1}
                </div>
              );
            })}
          </div>
          <span className="text-xs font-semibold text-rose-500 ml-1">
            {strikes} / {maxStrikes}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Strike Warning Modal (Strikes 1 and 2)
 */
export function SafeExamWarningModal({
  isOpen,
  strike,
  maxStrikes = 3,
  violation,
  onAcknowledge,
}: {
  isOpen: boolean;
  strike: number;
  maxStrikes?: number;
  violation: ProctorViolation | null;
  onAcknowledge: () => void;
}) {
  // Allow Escape or Enter to acknowledge and close the modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onAcknowledge();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onAcknowledge]);

  if (!isOpen || !violation) return null;

  const isFinalWarning = strike === maxStrikes - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        // Allow clicking the backdrop to close and resume
        if (e.target === e.currentTarget) {
          onAcknowledge();
        }
      }}
    >
      <Card
        className={
          "relative max-w-md w-full max-h-[90vh] overflow-y-auto border shadow-2xl " +
          (isFinalWarning ? "border-rose-500/80 bg-background" : "border-amber-500/80 bg-background")
        }
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onAcknowledge}
          className="absolute right-3.5 top-3.5 z-10 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          title="Close warning and continue exam (Esc)"
          aria-label="Close warning and continue exam"
        >
          <X className="h-5 w-5" />
        </button>

        <CardContent className="p-6 sm:p-7 space-y-5 text-center">
          <div
            className={
              "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl " +
              (isFinalWarning
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                : "bg-amber-500/15 text-amber-500 border border-amber-500/30")
            }
          >
            <AlertTriangle className="h-7 w-7" />
          </div>

          <div>
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold " +
                (isFinalWarning
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400")
              }
            >
              {isFinalWarning ? "CRITICAL: FINAL WARNING" : "SECURITY VIOLATION"} · Warning {strike} of {maxStrikes}
            </span>
            <h3 className="mt-2 text-xl font-bold tracking-tight">
              {isFinalWarning ? "One Strike Left Before Disqualification" : "Proctoring Alert Detected"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {violation.reason}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-left text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Event:</span>
              <span className="font-mono uppercase font-semibold text-foreground">
                {violation.type.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Recorded at:</span>
              <span className="font-mono text-foreground">
                {new Date(violation.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <p className="text-xs font-medium text-rose-500 dark:text-rose-400">
            {isFinalWarning
              ? "⚠️ Warning: The next violation will immediately terminate and permanently block this assessment."
              : `You have ${maxStrikes - strike} strike(s) remaining before immediate termination.`}
          </p>

          <div className="pt-1">
            <Button
              onClick={onAcknowledge}
              className={
                "w-full text-white font-semibold shadow-md cursor-pointer " +
                (isFinalWarning ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700")
              }
            >
              <Check className="mr-2 h-4 w-4" />
              Close Warning & Continue Exam
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Press Enter or Esc to dismiss and resume
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Disqualified View
 */
export function SafeExamDisqualifiedCard({
  violations,
  onReturn,
}: {
  violations: ProctorViolation[];
  onReturn?: () => void;
}) {
  return (
    <Card className="border-rose-500/40 bg-card shadow-lg">
      <CardContent className="p-8 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <XCircle className="h-9 w-9" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            DISQUALIFIED · HONOR CODE VIOLATION
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Assessment Terminated & Blocked
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            This assessment attempt has been terminated because the maximum limit of 3 proctoring violation warnings was exceeded.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-left max-w-lg mx-auto space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Recorded Violation Log:
          </p>
          <div className="divide-y divide-border/60 text-xs">
            {violations.length > 0 ? (
              violations.map((v, i) => (
                <div key={i} className="py-2 flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">
                    #{i + 1} {v.reason}
                  </span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-2 text-muted-foreground">3 integrity violations recorded during session.</p>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground max-w-sm mx-auto">
          Under institutional testing integrity policies, your score has been logged as <strong>0%</strong> and re-attempts for this assessment version are permanently locked.
        </div>

        {onReturn && (
          <Button onClick={onReturn} variant="outline" className="mt-4">
            Return to Assessments
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Hook to manage full proctoring lifecycle
 */
export function useSafeExamProctor({
  isActive,
  attemptId,
  onDisqualify,
  maxStrikes = 3,
}: {
  isActive: boolean;
  attemptId: string;
  onDisqualify: (violations: ProctorViolation[]) => Promise<void> | void;
  maxStrikes?: number;
}) {
  const [strikes, setStrikes] = useState(0);
  const [violations, setViolations] = useState<ProctorViolation[]>([]);
  const [activeWarning, setActiveWarning] = useState<ProctorViolation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);

  const lastViolationTimeRef = useRef(0);
  const strikesRef = useRef(strikes);
  strikesRef.current = strikes;
  const violationsRef = useRef(violations);
  violationsRef.current = violations;
  const isDisqualifiedRef = useRef(isDisqualified);
  isDisqualifiedRef.current = isDisqualified;

  const triggerViolation = useCallback(
    (type: ProctorViolation["type"], reason: string) => {
      if (!isActive || isDisqualifiedRef.current) return;

      const now = Date.now();
      // Debounce linked events and respect grace period after acknowledging a warning
      if (now < lastViolationTimeRef.current || now - lastViolationTimeRef.current < 2500) {
        return;
      }
      lastViolationTimeRef.current = now;

      playWarningSound();

      const newViolation: ProctorViolation = {
        type,
        reason,
        timestamp: new Date().toISOString(),
      };

      const updatedStrikes = strikesRef.current + 1;
      const updatedViolations = [...violationsRef.current, newViolation];

      setStrikes(updatedStrikes);
      setViolations(updatedViolations);

      if (updatedStrikes >= maxStrikes) {
        setIsDisqualified(true);
        setActiveWarning(null);
        // Exit fullscreen on disqualification if active
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        onDisqualify(updatedViolations);
      } else {
        setActiveWarning(newViolation);
      }
    },
    [isActive, maxStrikes, onDisqualify],
  );

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } catch {
      // Fullscreen request might be blocked by browser policy
    }
  }, []);

  // Monitor fullscreen change
  useEffect(() => {
    function handleFullscreenChange() {
      const isFull = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isFull);

      if (isActive && !isFull && !isDisqualifiedRef.current) {
        triggerViolation(
          "fullscreen_exit",
          "You exited fullscreen mode. Proctored exams must remain in fullscreen.",
        );
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isActive, triggerViolation]);

  // Monitor tab switch & blur
  useEffect(() => {
    if (!isActive) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        triggerViolation(
          "tab_switch",
          "Tab switch or browser minimization detected. Leaving the exam window is prohibited.",
        );
      }
    }

    function handleBlur() {
      triggerViolation(
        "window_blur",
        "Window focus lost. Navigating away from the assessment is prohibited.",
      );
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isActive, triggerViolation]);

  // Monitor anti-copy, cut, contextmenu, keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    function handleCopy(e: ClipboardEvent) {
      e.preventDefault();
      triggerViolation(
        "copy_attempt",
        "Unauthorized copy attempt detected. Assessment content is protected.",
      );
    }

    function handleCut(e: ClipboardEvent) {
      e.preventDefault();
      triggerViolation(
        "copy_attempt",
        "Unauthorized cut attempt detected. Assessment content is protected.",
      );
    }

    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
      triggerViolation(
        "shortcut",
        "Right-click context menu is disabled during proctored exams.",
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isModifier = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Prohibited copy/paste/save/inspect shortcuts
      if (
        (isModifier && ["c", "v", "x", "a", "s", "u", "p"].includes(key)) ||
        key === "f12" ||
        key === "printscreen" ||
        (isModifier && e.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        e.preventDefault();
        triggerViolation(
          "shortcut",
          `Prohibited shortcut (${isModifier ? "Ctrl/Cmd+" : ""}${key.toUpperCase()}) was intercepted.`,
        );
      }
    }

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, triggerViolation]);

  const acknowledgeWarning = useCallback(() => {
    setActiveWarning(null);
    // Add a 3.5-second grace period so returning to the exam tab and fullscreen does not re-trigger immediate violations
    lastViolationTimeRef.current = Date.now() + 3500;
    requestFullscreen().catch(() => {});
  }, [requestFullscreen]);

  return {
    strikes,
    violations,
    activeWarning,
    isFullscreen,
    isDisqualified,
    acknowledgeWarning,
    requestFullscreen,
  };
}
