"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, CalendarDays, CheckCircle2, ChevronRight, Clock, MapPin, Search, Sparkles, Star, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MatchScoreRing } from "@/components/shared/match-score-ring";
import { cn } from "@/lib/utils";
import { applyToOpportunity, getMatchedSkills, getMatchScore, getMissingSkills, toggleSavedOpportunity, usePlatformData, type Opportunity } from "@/lib/platform-store";

const filters = ["All", "Internship", "Job", "Apprenticeship", "Live Project"];
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } } as const;
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } } } as const;

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function OpportunityDetail({ opportunity, applied, saved, onClose, onApply, onSave }: { opportunity: Opportunity; applied: boolean; saved: boolean; onClose: () => void; onApply: () => void; onSave: () => void }) {
  const score = getMatchScore(opportunity.skills);
  const matched = getMatchedSkills(opportunity.skills);
  const missing = getMissingSkills(opportunity.skills);

  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="sticky top-4 overflow-hidden rounded-2xl border border-[hsl(var(--role-primary)/0.25)] bg-card shadow-lg">
    <div className="role-gradient p-5 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Opportunity brief</p><h2 className="mt-1 font-display text-xl font-bold">{opportunity.title}</h2><p className="mt-1 text-sm text-white/80">{opportunity.company} · {opportunity.location}</p></div><button onClick={onClose} aria-label="Close opportunity details" className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button></div></div>
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-4 rounded-xl bg-muted/55 p-3"><MatchScoreRing score={score} size="sm" /><div><p className="text-sm font-semibold">{score}% profile match</p><p className="text-xs text-muted-foreground">Based on your skills and verified assessments</p></div></div>
      <p className="text-sm leading-6 text-muted-foreground">{opportunity.description}</p>
      <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-border p-3"><Clock className="mb-1.5 h-4 w-4 role-text" /><p className="font-semibold">{opportunity.duration}</p><p className="text-muted-foreground">{opportunity.workMode}</p></div><div className="rounded-xl border border-border p-3"><Briefcase className="mb-1.5 h-4 w-4 role-text" /><p className="font-semibold">{opportunity.stipend}</p><p className="text-muted-foreground">{opportunity.seats} seats available</p></div></div>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Skill mapping</p><div className="space-y-2 text-xs"><div className="flex flex-wrap items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{matched.length ? matched.map((skill) => <Badge key={skill} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{skill}</Badge>) : <span className="text-muted-foreground">Build a foundational skill to improve your match.</span>}</div>{missing.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><Target className="h-3.5 w-3.5 text-amber-500" />{missing.map((skill) => <Badge key={skill} variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300">Develop: {skill}</Badge>)}</div>}</div></div>
      <div className="flex gap-2 border-t border-border pt-4"><Button onClick={onApply} disabled={applied || opportunity.status === "Closed"} className="flex-1 role-gradient border-0 text-white">{applied ? <><CheckCircle2 className="mr-1.5 h-4 w-4" />Applied</> : "Apply now"}</Button><Button onClick={onSave} variant="outline" aria-label={saved ? "Remove saved opportunity" : "Save opportunity"} className={cn(saved && "border-amber-500/40 text-amber-600")}><Star className={cn("h-4 w-4", saved && "fill-current")} /></Button></div>
    </div>
  </motion.div>;
}

export default function MarketplacePage() {
  const platform = usePlatformData();
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const opportunities = platform?.opportunities ?? [];
  const applications = platform?.applications ?? [];
  const savedIds = platform?.savedOpportunityIds ?? [];
  const selected = opportunities.find((opportunity) => opportunity.id === selectedId) ?? null;
  const filtered = useMemo(() => opportunities.filter((opportunity) => {
    const matchesFilter = activeFilter === "All" || opportunity.type === activeFilter;
    const haystack = `${opportunity.title} ${opportunity.company} ${opportunity.location} ${opportunity.skills.join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  }), [activeFilter, opportunities, query]);
  const apply = (opportunity: Opportunity) => { const result = applyToOpportunity(opportunity.id); setNotice(result.created ? `Application sent to ${opportunity.company}. Track the next step in Applications.` : "You have already applied to this opportunity."); };
  const save = (opportunity: Opportunity) => { toggleSavedOpportunity(opportunity.id); setNotice(savedIds.includes(opportunity.id) ? "Removed from your saved opportunities." : "Saved for later."); };

  return <DashboardShell role="student" title="Marketplace"><motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
    <motion.section variants={item} className="rounded-3xl role-gradient p-6 text-white md:p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" />Explainable opportunity matching</div><h1 className="font-display text-3xl font-bold">Find work that builds your future.</h1><p className="mt-2 text-sm leading-6 text-white/80">Every score shows how your verified skills align—and exactly what to develop next.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm"><p className="font-semibold">{opportunities.filter((opportunity) => opportunity.status !== "Closed").length} active opportunities</p><p className="mt-0.5 text-xs text-white/70">Internships, jobs, apprenticeships & projects</p></div></div></motion.section>
    {notice && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X className="h-4 w-4" /></button></motion.div>}
    <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by role, company, location or skill…" className="h-11 pl-9" /></div><div className="flex items-center gap-2 rounded-xl border border-border px-3 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4 role-text" />Deadlines shown in IST</div></motion.div>
    <motion.div variants={item} className="flex flex-wrap gap-2">{filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition", activeFilter === filter ? "role-gradient border-transparent text-white" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")}>{filter}</button>)}</motion.div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"><motion.div variants={item} className="space-y-3">{filtered.map((opportunity) => { const score = getMatchScore(opportunity.skills); const applied = applications.some((application) => application.opportunityId === opportunity.id); const saved = savedIds.includes(opportunity.id); return <Card key={opportunity.id} onClick={() => setSelectedId(opportunity.id)} className={cn("cursor-pointer border-border transition hover:-translate-y-0.5 hover:shadow-md", selectedId === opportunity.id && "border-[hsl(var(--role-primary)/0.55)] ring-2 ring-[hsl(var(--role-primary)/0.1)]")}><CardContent className="flex gap-4 p-4"><MatchScoreRing score={score} size="sm" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{opportunity.title}</h2><Badge variant="outline" className="text-[0.65rem]">{opportunity.type}</Badge>{opportunity.status === "Closing soon" && <Badge className="bg-amber-500/10 text-[0.65rem] text-amber-700 hover:bg-amber-500/10">Closing soon</Badge>}</div><p className="mt-0.5 text-xs font-medium text-muted-foreground">{opportunity.company}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{opportunity.location} · {opportunity.workMode}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{opportunity.duration}</span><span>Closes {formatDeadline(opportunity.deadline)}</span></div><div className="mt-2 flex flex-wrap gap-1">{opportunity.skills.map((skill) => <Badge key={skill} variant="secondary" className="px-1.5 py-0 text-[0.6rem]">{skill}</Badge>)}</div></div><div className="flex shrink-0 flex-col items-end gap-2"><button onClick={(event) => { event.stopPropagation(); save(opportunity); }} aria-label={saved ? "Remove saved opportunity" : "Save opportunity"} className={cn("rounded-lg p-1.5", saved ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}><Star className={cn("h-4 w-4", saved && "fill-current")} /></button><Button onClick={(event) => { event.stopPropagation(); apply(opportunity); }} disabled={applied || opportunity.status === "Closed"} size="sm" className="role-gradient border-0 text-xs text-white">{applied ? "Applied" : "Apply"}<ChevronRight className="ml-0.5 h-3 w-3" /></Button></div></CardContent></Card>; })}{filtered.length === 0 && <Card><CardContent className="p-10 text-center"><Search className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No opportunities match that search</p><p className="mt-1 text-xs text-muted-foreground">Try a different skill or clear the filters.</p></CardContent></Card>}</motion.div><aside>{selected ? <OpportunityDetail opportunity={selected} applied={applications.some((application) => application.opportunityId === selected.id)} saved={savedIds.includes(selected.id)} onClose={() => setSelectedId(null)} onApply={() => apply(selected)} onSave={() => save(selected)} /> : <Card className="sticky top-4 border-dashed"><CardHeader><CardTitle className="text-base">Make the match meaningful</CardTitle><CardDescription>Select an opportunity to see your skill fit, verified strengths and practical gap actions.</CardDescription></CardHeader><CardContent className="space-y-3 text-xs text-muted-foreground"><div className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full role-bg-soft role-text">1</span><span>Review requirements and match evidence.</span></div><div className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full role-bg-soft role-text">2</span><span>Apply with your verified portfolio.</span></div><div className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full role-bg-soft role-text">3</span><span>Track every decision in one place.</span></div></CardContent></Card>}</aside></div>
  </motion.div></DashboardShell>;
}
