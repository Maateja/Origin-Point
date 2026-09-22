"use client";
import { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-heading">
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] role-text">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
    </section>
  );
}
export function DataState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => unknown;
}) {
  if (error)
    return (
      <div
        role="alert"
        className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8"
      >
        <AlertCircle className="mb-3 h-6 w-6 text-destructive" />
        <h2 className="text-lg font-semibold">
          We couldn’t open your workspace
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button onClick={retry} variant="outline" className="mt-5">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  if (loading)
    return (
      <div role="status" aria-label="Loading workspace" className="space-y-5">
        <div className="h-44 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <span className="sr-only">Loading your records</span>
      </div>
    );
  return null;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-3xl px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl role-bg-soft role-text">
        <Inbox className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="glass-metric">
      <CardContent className="p-5">
        {icon && (
          <div className="glass-icon-tile" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="glass-metric-copy">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <ArrowUpRight className="h-4 w-4 role-text opacity-60" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight">
            {value}
          </p>
          {detail && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {detail}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2 text-xs font-semibold">
      <span>{label}</span>
      {children}
      {hint && (
        <span className="block text-xs font-normal leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
export function Tag({
  children,
  positive = false,
}: {
  children: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        positive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function run(task: () => Promise<unknown>, success = "Changes saved.") {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {notice}
        </div>
      )}
    </>
  );
  return { busy, run, feedback };
}
export function SaveButton({
  busy,
  children = "Save changes",
}: {
  busy: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className="role-gradient border-0 text-white"
    >
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {busy ? "Saving…" : children}
    </Button>
  );
}
