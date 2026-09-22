"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  BrainCircuit,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag as TagIcon,
  RefreshCw,
  Zap,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IndustryQuestion } from "@/lib/industry-assessments";

interface AIScreeningAssistantProps {
  roleTitle: string;
  skills: string[];
  description?: string;
  onQuestionsGenerated: (
    questions: IndustryQuestion[],
    metadata: { title?: string; summary?: string },
  ) => void;
  className?: string;
}

export function AIScreeningAssistant({
  roleTitle,
  skills,
  description = "",
  onQuestionsGenerated,
  className = "",
}: AIScreeningAssistantProps) {
  const [difficulty, setDifficulty] = useState<
    "Junior / Intern" | "Mid-Level" | "Senior / Lead"
  >("Mid-Level");
  const [categoryFocus, setCategoryFocus] = useState<string>("Balanced");
  const [count, setCount] = useState<number>(5);
  const [customTopics, setCustomTopics] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastGeneratedCount, setLastGeneratedCount] = useState<number | null>(
    null,
  );
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const focusOptions = [
    {
      id: "Balanced",
      label: "Balanced Evaluation",
      desc: "Mix of domain knowledge, practical tasks and workplace judgment",
    },
    {
      id: "Core domain knowledge",
      label: "Domain Knowledge",
      desc: "Fundamentals and methods relevant to the supplied role and skills",
    },
    {
      id: "Practical problem solving",
      label: "Practical Scenarios",
      desc: "Troubleshooting, quality checks and everyday decisions in this domain",
    },
    {
      id: "Workplace reasoning and communication",
      label: "Reasoning & Communication",
      desc: "Job-related reasoning, collaboration and situational judgment",
    },
  ];

  async function handleGenerate() {
    setIsLoading(true);
    setLoadingStep("Waiting for Gemini to return a draft…");
    setGenerationError("");
    setLastGeneratedCount(null);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roleTitle,
          skills,
          consent,
          description: description || "",
          difficulty,
          categoryFocus,
          customTopics: customTopics.trim(),
          count,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to generate questions");
      }

      if (resData.questions && resData.questions.length > 0) {
        setLastGeneratedCount(resData.questions.length);
        const suggestedTitle = roleTitle
          ? `${roleTitle} Competency Screening (${difficulty})`
          : undefined;
        const suggestedSummary = `Draft ${resData.questions.length}-question assessment covering ${skills.slice(0, 3).join(", ")} (${difficulty}). Questions and answer keys require author review before publication.`;

        onQuestionsGenerated(resData.questions, {
          title: suggestedTitle,
          summary: suggestedSummary,
        });
      }
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate questions");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  }

  return (
    <div className={`glass-panel rounded-2xl p-5 transition-all ${className}`}>
      {/* Header & Badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <h3 className="font-semibold text-foreground text-base tracking-tight flex items-center gap-2">
              AI Assessment Studio
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                JD Grounded
              </span>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate custom screening questions tailored directly to this
            role&apos;s job description, required tech stack, and experience
            level.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={
            isLoading || !consent || !roleTitle.trim() || !skills.length
          }
          className="relative overflow-hidden bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-medium shadow-md shadow-amber-500/10 shrink-0 cursor-pointer h-9 px-4 text-xs"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Generate {count} Questions
            </>
          )}
        </Button>
      </div>

      <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Allow sending this role title, skill list, description and custom topics
        to Google Gemini. Do not include personal or confidential information.
        Generated questions are unverified drafts; review every answer before
        publishing.
      </label>
      {generationError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {generationError}
        </p>
      )}

      {/* Live JD & Skill Anchors Banner */}
      <div className="mt-4 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 font-medium text-foreground text-[11px] uppercase tracking-wider">
            <FileText className="h-3 w-3 text-muted-foreground" /> Role Anchor:
          </span>
          <span className="font-semibold text-foreground bg-background px-2 py-0.5 rounded-md border border-border">
            {roleTitle || "Untitled Role"}
          </span>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mr-1">
              <TagIcon className="h-3 w-3" /> Grounding Skills:
            </span>
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-md bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
            <Info className="h-3 w-3 text-amber-500" />
            No skills detected on this role yet. We will formulate general
            software engineering questions or use your custom topics below.
          </p>
        )}
      </div>

      {/* Interactive Controls Bar */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Difficulty Level Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 border border-border">
            {(["Junior / Intern", "Mid-Level", "Senior / Lead"] as const).map(
              (lvl) => {
                const active = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`rounded-lg py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-background text-foreground shadow-sm font-semibold ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lvl.split(" ")[0]}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Focus Area */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-amber-500" /> Assessment Focus
          </label>
          <select
            value={categoryFocus}
            onChange={(e) => setCategoryFocus(e.target.value)}
            className="field text-xs py-1.5 cursor-pointer bg-background"
          >
            {focusOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Question Count */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sliders className="h-3 w-3 text-amber-500" /> Question Count
          </label>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/50 p-1 border border-border">
            {[3, 5, 8, 10].map((num) => {
              const active = count === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`rounded-lg py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-background text-foreground shadow-sm font-semibold ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {num} Qs
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Collapsible: Custom JD / Specific Requirements */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          <span>
            {showAdvanced ? "Hide" : "Add"} Custom JD snippets or target focus
            topics
          </span>
          {customTopics && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-2 rounded-xl border border-border bg-background p-3">
            <p className="text-[11px] text-muted-foreground">
              Paste specific paragraphs from your internal JD, required APIs
              (e.g. Next.js App Router, gRPC, Redis caching), or edge-case
              engineering scenarios you want candidates tested on:
            </p>
            <textarea
              className="field min-h-20 text-xs font-mono"
              placeholder="e.g. Must evaluate candidate on PostgreSQL transaction isolation levels, React 19 server actions, handling websocket reconnects, and rate limiting."
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs flex items-center gap-3">
          <BrainCircuit className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground text-xs">
              AI Assessment Studio at work...
            </p>
            <p className="text-muted-foreground text-[11px]">{loadingStep}</p>
          </div>
        </div>
      )}

      {/* Feedback banner after generation */}
      {!isLoading && lastGeneratedCount !== null && (
        <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/[0.06] p-2.5 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <span>
              Successfully populated{" "}
              <strong>{lastGeneratedCount} draft questions</strong> generated
              for <strong>{difficulty}</strong> candidates. Review and edit the
              answer keys below!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
