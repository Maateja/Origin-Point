"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIScreeningAssistant } from "@/components/platform/ai-screening-assistant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  useIndustryAssessments,
  type IndustryQuestion,
} from "@/lib/industry-assessments";
import {
  applyToOpportunity,
  closeOpportunity,
  createOpportunity,
  getMatchScore,
  getMissingSkills,
  getMatchedSkills,
  isOpportunityOpen,
  ownSkills,
  toggleSavedOpportunity,
  usePlatformData,
  type OpportunityType,
  type Role,
} from "@/lib/platform-store";
import {
  DataState,
  Empty,
  Field,
  Metric,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
const opportunityTypes: OpportunityType[] = [
  "Internship",
  "Job",
  "Apprenticeship",
  "Live Project",
  "Training",
  "Workshop",
  "Mentorship",
  "FDP",
  "Faculty Internship",
  "Consultancy",
  "Research",
];
const blankQuestion = (): IndustryQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
  skillArea: "",
  category: "Technical",
});

export function OpportunityWorkspace({
  role = "student",
  types,
  compose = false,
  title = "Opportunities",
}: {
  role?: Role;
  types?: OpportunityType[];
  compose?: boolean;
  title?: string;
}) {
  const state = usePlatformData();
  const assessments = useIndustryAssessments();
  const data = state.data;
  const action = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Assessment Gate state for publishing
  const [requireExam, setRequireExam] = useState(false);
  const [examCutoff, setExamCutoff] = useState(70);
  const [examTitle, setExamTitle] = useState("");
  const [examSummary, setExamSummary] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [examQuestions, setExamQuestions] = useState<IndustryQuestion[]>([]);

  function updateExamQuestion(index: number, patch: Partial<IndustryQuestion>) {
    setExamQuestions((items) =>
      items.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("opportunity");
    if (id) {
      setFocusedId(id);
      setExpanded(id);
    }
  }, []);
  const skills = ownSkills(data);
  const own =
    data?.opportunities?.filter((o) => o.ownerId === data?.profile?.id) ?? [];
  const source = compose
    ? own
    : (data?.opportunities.filter(
        (o) =>
          (o.audience === role || o.audience === "all") &&
          (!types || types.includes(o.type)),
      ) ?? []);
  const visible = source
    .filter(
      (o) =>
        (!focusedId || o.id === focusedId) &&
        (type === "All" || o.type === type) &&
        (!savedOnly || data?.savedOpportunityIds.includes(o.id)) &&
        [o.title, o.company, o.location, ...o.skills]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      compose
        ? b.publishedAt.localeCompare(a.publishedAt)
        : Number(isOpportunityOpen(b)) - Number(isOpportunityOpen(a)) ||
          getMatchScore(b.skills, skills) - getMatchScore(a.skills, skills),
    );
  const availableTypes = compose
    ? (types ?? opportunityTypes)
    : [...new Set(source.map((o) => o.type))];
  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const value = (key: string) => String(f.get(key) || "").trim();
    const input = {
      title: value("title"),
      type: value("type") as OpportunityType,
      audience: value("audience") as "student" | "academician" | "all",
      location: value("location"),
      workMode: value("workMode") as "Remote" | "Hybrid" | "On-site",
      duration: value("duration"),
      stipend: value("stipend"),
      deadline: value("deadline"),
      skills: [
        ...new Set(
          value("skills")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ],
      description: value("description"),
      seats: Number(f.get("seats")),
      requiresAssessment: requireExam,
      assessmentCutoff: requireExam ? examCutoff : undefined,
      attachedAssessment: requireExam
        ? {
            title: examTitle || `${value("title")} Competency Screening`,
            summary:
              examSummary ||
              "Proctored competency assessment. Fullscreen and anti-cheating rules enforced.",
            questions: examQuestions.length > 0 ? examQuestions : [blankQuestion()],
            passingScore: examCutoff,
          }
        : undefined,
    };
    if (
      await action.run(
        () => createOpportunity(input),
        requireExam
          ? "Opportunity & attached Safe Exam published. Candidates must pass to apply."
          : "Opportunity published. Eligible members can now apply.",
      )
    ) {
      formRef.current?.reset();
      setRequireExam(false);
      setExamQuestions([]);
      setExamTitle("");
      setExamSummary("");
    }
  }
  return (
    <DashboardShell role={role} title={title}>
      <div className="space-y-6">
        <PageHeading
          eyebrow={
            compose ? "Publish & collaborate" : "Discover your next step"
          }
          title={
            compose
              ? "Good work starts with a clear brief."
              : "Find where your skills belong."
          }
          description={
            compose
              ? "Publish real opportunities, set expectations, and connect with learners and faculty."
              : "Explore published opportunities ranked by the skills saved on your profile. Open a brief to see requirements and gaps."
          }
          action={
            <Link href={"/" + role + "/profile"}>
              <Button variant="outline">
                Update profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          }
        />
        <DataState {...state} retry={state.refresh} />
        {data && !state.error && (
          <>
            {action.feedback}
            {focusedId && (
              <Button variant="outline" onClick={() => setFocusedId(null)}>
                Show all opportunities
              </Button>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label={
                  compose
                    ? "Your published opportunities"
                    : "Available opportunities"
                }
                value={source.filter(isOpportunityOpen).length}
              />
              <Metric
                label="Saved opportunities"
                value={data.savedOpportunityIds.length}
              />
              <Metric
                label={compose ? "Applications received" : "Your applications"}
                value={
                  data.applications.filter((a) =>
                    compose
                      ? own.some((o) => o.id === a.opportunityId)
                      : a.applicantId === data.profile.id,
                  ).length
                }
              />
            </div>
            {compose && (
              <Card>
                <CardHeader>
                  <CardTitle>Publish an opportunity</CardTitle>
                  <CardDescription>
                    Published under{" "}
                    {data.profile.organization ||
                      data.profile.full_name ||
                      "your organization"}
                    . All fields below describe the actual opportunity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form ref={formRef} onSubmit={publish} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Title">
                        <input
                          required
                          minLength={4}
                          maxLength={160}
                          name="title"
                          className="field"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                        />
                      </Field>
                      <Field label="Type">
                        <select name="type" className="field">
                          {(types ?? opportunityTypes).map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Who can apply?">
                        <select
                          name="audience"
                          className="field"
                          defaultValue={
                            role === "academician" ? "academician" : "student"
                          }
                        >
                          <option value="student">Students</option>
                          <option value="academician">Academicians</option>
                          <option value="all">Students and academicians</option>
                        </select>
                      </Field>
                      <Field label="Location">
                        <input required name="location" className="field" />
                      </Field>
                      <Field label="Work mode">
                        <select name="workMode" className="field">
                          <option>Remote</option>
                          <option>Hybrid</option>
                          <option>On-site</option>
                        </select>
                      </Field>
                      <Field label="Duration">
                        <input
                          required
                          name="duration"
                          className="field"
                          placeholder="e.g. 12 weeks"
                        />
                      </Field>
                      <Field label="Compensation / fees">
                        <input
                          required
                          name="stipend"
                          className="field"
                          placeholder="Describe stipend, fees, or unpaid status"
                        />
                      </Field>
                      <Field label="Application deadline (IST)">
                        <input
                          name="deadline"
                          required
                          type="date"
                          min={new Date().toLocaleDateString("en-CA", {
                            timeZone: "Asia/Kolkata",
                          })}
                          className="field"
                        />
                      </Field>
                      <Field label="Number of places">
                        <input
                          name="seats"
                          required
                          type="number"
                          min="1"
                          max="500"
                          className="field"
                        />
                      </Field>
                    </div>
                    <Field
                      label="Required skills"
                      hint="Separate skills with commas. Compatibility is the percentage of these skills in the applicant’s saved profile."
                    >
                      <input
                        name="skills"
                        required
                        maxLength={1200}
                        className="field"
                        value={formSkills}
                        onChange={(e) => setFormSkills(e.target.value)}
                      />
                    </Field>
                    <Field
                      label="The brief"
                      hint="Explain the work, requirements, mentorship, and expected outcomes."
                    >
                      <textarea
                        name="description"
                        required
                        minLength={24}
                        maxLength={10000}
                        className="field min-h-32"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </Field>

                    {/* ── Pre-Screening Assessment Gate ── */}
                    <div className="rounded-2xl border border-border p-5 bg-card/50 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl role-bg-soft role-text">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">
                              Pre-Screening Assessment Gate
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Require applicants to pass a proctored safe exam before submitting their application.
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={requireExam}
                            onChange={(e) => setRequireExam(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {requireExam && (
                        <div className="pt-4 border-t border-border space-y-5 animate-in fade-in duration-200">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Assessment Title">
                              <input
                                className="field"
                                value={examTitle}
                                onChange={(e) => setExamTitle(e.target.value)}
                                placeholder="e.g. Frontend Competency Screening"
                                required={requireExam}
                              />
                            </Field>
                            <Field
                              label="Target Passing Score (%)"
                              hint="Candidates scoring below this target are flagged."
                            >
                              <input
                                type="number"
                                min={1}
                                max={100}
                                className="field"
                                value={examCutoff}
                                onChange={(e) => setExamCutoff(Number(e.target.value))}
                                required={requireExam}
                              />
                            </Field>
                          </div>

                          <Field
                            label="Candidate Instructions"
                            hint="Displayed on the pre-exam briefing modal before entering safe mode."
                          >
                            <textarea
                              className="field min-h-20"
                              value={examSummary}
                              onChange={(e) => setExamSummary(e.target.value)}
                              placeholder="e.g. 15-minute proctored assessment. Fullscreen is mandatory; tab switching or copying triggers disqualification."
                              required={requireExam}
                            />
                          </Field>

                          {/* AI Generator Assistant */}
                          <AIScreeningAssistant
                            roleTitle={formTitle}
                            skills={formSkills
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)}
                            description={formDescription}
                            onQuestionsGenerated={(generated, meta) => {
                              setExamQuestions(generated);
                              if (!examTitle && meta.title) {
                                setExamTitle(meta.title);
                              }
                              if (!examSummary && meta.summary) {
                                setExamSummary(meta.summary);
                              }
                            }}
                          />

                          {/* Questions List */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                                  Screening Questions ({examQuestions.length})
                                  <span className="text-xs text-muted-foreground font-normal">
                                    · Max 30 questions
                                  </span>
                                </span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Click the letter badge next to an option to mark it as the verified correct answer.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setExamQuestions([
                                    ...examQuestions,
                                    blankQuestion(),
                                  ])
                                }
                                className="text-xs h-8 cursor-pointer shrink-0"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                              </Button>
                            </div>

                            {examQuestions.map((q, qIdx) => (
                              <div
                                key={qIdx}
                                className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm transition-all hover:border-border/80"
                              >
                                {/* Header: Q# + Skill Tag + Category Badge + Remove button */}
                                <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center justify-center rounded-lg bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground">
                                      Q{qIdx + 1}
                                    </span>
                                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                      {q.skillArea || "General Engineering"}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                        q.category === "Technical"
                                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                          : q.category === "Aptitude"
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                      }`}
                                    >
                                      {q.category}
                                    </span>
                                  </div>
                                  {examQuestions.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setExamQuestions(
                                          examQuestions.filter(
                                            (_, i) => i !== qIdx,
                                          ),
                                        )
                                      }
                                      className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 px-2 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      Delete
                                    </Button>
                                  )}
                                </div>

                                {/* Meta edit row: Competency tag + Category selector */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field label="Competency / skill tested">
                                    <input
                                      className="field text-xs"
                                      value={q.skillArea}
                                      required={requireExam}
                                      placeholder="e.g. Next.js, React Hooks, PostgreSQL"
                                      onChange={(e) =>
                                        updateExamQuestion(qIdx, {
                                          skillArea: e.target.value,
                                        })
                                      }
                                    />
                                  </Field>
                                  <Field label="Question category">
                                    <select
                                      className="field text-xs cursor-pointer"
                                      value={q.category}
                                      onChange={(e) =>
                                        updateExamQuestion(qIdx, {
                                          category: e.target
                                            .value as IndustryQuestion["category"],
                                        })
                                      }
                                    >
                                      <option value="Technical">Technical</option>
                                      <option value="Aptitude">Aptitude</option>
                                      <option value="Soft skills">Soft skills</option>
                                    </select>
                                  </Field>
                                </div>

                                {/* Question Prompt */}
                                <Field label="Problem Statement / Scenario">
                                  <textarea
                                    className="field min-h-16 text-sm font-medium"
                                    value={q.question}
                                    required={requireExam}
                                    placeholder="Scenario or practical problem statement..."
                                    onChange={(e) =>
                                      updateExamQuestion(qIdx, {
                                        question: e.target.value,
                                      })
                                    }
                                  />
                                </Field>

                                {/* 4 Choices with integrated Radio correct-answer selector */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                    <span>Answer Options</span>
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                      Click the letter button next to the correct answer
                                    </span>
                                  </div>
                                  <div className="grid gap-2.5 sm:grid-cols-2">
                                    {q.options.map((opt, oIdx) => {
                                      const isCorrect = q.correctAnswer === oIdx;
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`flex items-center gap-2.5 rounded-xl border p-2 transition-all ${
                                            isCorrect
                                              ? "border-green-500/50 bg-green-500/[0.05] ring-1 ring-green-500/20"
                                              : "border-border bg-background"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateExamQuestion(qIdx, {
                                                correctAnswer: oIdx,
                                              })
                                            }
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all cursor-pointer ${
                                              isCorrect
                                                ? "border-green-500 bg-green-500 text-white shadow-sm"
                                                : "border-muted-foreground/40 bg-muted/40 text-muted-foreground hover:border-foreground"
                                            }`}
                                            title={
                                              isCorrect
                                                ? "Marked as correct answer"
                                                : "Click to mark as correct"
                                            }
                                          >
                                            {String.fromCharCode(65 + oIdx)}
                                          </button>
                                          <input
                                            className="field text-xs py-1 px-2 border-0 bg-transparent focus:ring-0 focus:border-0"
                                            value={opt}
                                            required={requireExam}
                                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                            onChange={(e) => {
                                              const newOpts = [...q.options];
                                              newOpts[oIdx] = e.target.value;
                                              updateExamQuestion(qIdx, {
                                                options: newOpts,
                                              });
                                            }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Explanation Rationale */}
                                <Field
                                  label="Evaluation rationale & correct answer explanation"
                                  hint="Provides architectural grounding and will be referenced during candidate scoring audits."
                                >
                                  <textarea
                                    className="field text-xs min-h-14"
                                    required={requireExam}
                                    value={q.explanation}
                                    placeholder="Why is this answer correct? Explain the architectural or domain justification."
                                    onChange={(e) =>
                                      updateExamQuestion(qIdx, {
                                        explanation: e.target.value,
                                      })
                                    }
                                  />
                                </Field>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <SaveButton busy={action.busy}>
                      Publish opportunity
                    </SaveButton>
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  aria-label="Search opportunities"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="field !pl-10"
                  placeholder="Search role, organization, location, or skill"
                />
              </div>
              <select
                aria-label="Opportunity type"
                className="field sm:!w-48"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>All</option>
                {availableTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              {!compose && (
                <Button
                  variant={savedOnly ? "default" : "outline"}
                  onClick={() => setSavedOnly(!savedOnly)}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved
                </Button>
              )}
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {visible.map((o) => {
                const score = getMatchScore(o.skills, skills);
                const applied = data.applications.some(
                  (a) =>
                    a.opportunityId === o.id &&
                    a.applicantId === data.profile.id,
                );
                const saved = data.savedOpportunityIds.includes(o.id);
                const open = isOpportunityOpen(o);
                const missing = getMissingSkills(o.skills, skills);
                const linkedAssessment = assessments.data?.find(
                  (a) => a.opportunity_id === o.id && a.status === "Published",
                );
                const takenReport = data.reports.find(
                  (r) => r.industryAssessmentId === linkedAssessment?.id,
                );
                return (
                  <Card
                    key={o.id}
                    className="overflow-hidden transition hover:shadow-md"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl role-bg-soft role-text">
                            <Briefcase className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h2 className="font-display text-lg font-semibold leading-snug">
                              {o.title}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {o.company}
                            </p>
                          </div>
                        </div>
                        {!compose && (
                          <span className="rounded-xl role-bg-soft px-3 py-2 text-xs font-bold role-text">
                            {o.skills.length ? score + "%" : "—"}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Tag>{o.type}</Tag>
                        <Tag positive={open}>{open ? "Open" : "Closed"}</Tag>
                        <Tag>{o.workMode}</Tag>
                        {o.requiresAssessment && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Exam Required ({o.assessmentCutoff ?? 70}% Cutoff)
                          </span>
                        )}
                      </div>
                      {o.requiresAssessment && takenReport && (
                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              takenReport.scorePercent >= (o.assessmentCutoff ?? 70)
                                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-500 border border-red-500/30"
                            }`}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Your Screening Score: {takenReport.scorePercent}% (
                            {takenReport.scorePercent >= (o.assessmentCutoff ?? 70)
                              ? "Target Met"
                              : "Below Target"}
                            )
                          </span>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {o.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Apply by {o.deadline}
                        </span>
                        <span>{o.duration}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium">{o.stipend}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {o.skills.map((s) => (
                          <Tag
                            key={s}
                            positive={
                              !compose &&
                              getMatchedSkills([s], skills).length > 0
                            }
                          >
                            {s}
                          </Tag>
                        ))}
                      </div>
                      {expanded === o.id && (
                        <div className="mt-5 space-y-4 border-t border-border pt-5">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {o.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {o.seats} advertised places · Audience:{" "}
                            {o.audience === "all"
                              ? "students and academicians"
                              : o.audience}
                          </p>
                          {!compose && (
                            <div className="rounded-2xl bg-muted/50 p-4">
                              <p className="text-xs font-semibold">
                                Why this match?
                              </p>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {getMatchedSkills(o.skills, skills).length} of{" "}
                                {o.skills.length} requirements match your
                                self-reported skills.{" "}
                                {missing.length
                                  ? "Skills to develop: " + missing.join(", ")
                                  : "All listed requirements match your profile."}
                              </p>
                              {missing.length > 0 && role === "student" && (
                                <Link
                                  className="mt-3 inline-block text-xs font-semibold role-text"
                                  href="/student/assessment"
                                >
                                  Explore learning & assessments →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                        <button
                          aria-expanded={expanded === o.id}
                          onClick={() =>
                            setExpanded(expanded === o.id ? null : o.id)
                          }
                          className="text-xs font-semibold role-text"
                        >
                          {expanded === o.id
                            ? "Hide details"
                            : "Read the brief"}
                        </button>
                        <div className="flex gap-2">
                          {compose ? (
                            <Button
                              disabled={action.busy || !open}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                action.run(
                                  () => closeOpportunity(o.id),
                                  "Opportunity closed.",
                                )
                              }
                            >
                              Close applications
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={
                                  saved
                                    ? "Unsave opportunity"
                                    : "Save opportunity"
                                }
                                disabled={action.busy}
                                onClick={() =>
                                  action.run(
                                    () => toggleSavedOpportunity(o.id, saved),
                                    saved
                                      ? "Opportunity unsaved."
                                      : "Opportunity saved.",
                                  )
                                }
                              >
                                <Bookmark
                                  className={
                                    "h-4 w-4 " +
                                    (saved ? "fill-current role-text" : "")
                                  }
                                />
                              </Button>
                              {o.requiresAssessment && !applied && open && !takenReport ? (
                                <Link
                                  href={
                                    linkedAssessment
                                      ? `/student/industry-assessments/${linkedAssessment.id}`
                                      : "/student/industry-assessments"
                                  }
                                >
                                  <Button
                                    className="role-gradient border-0 text-white font-semibold cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                                    size="sm"
                                  >
                                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                                    Take Screening Exam to Apply
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  disabled={action.busy || applied || !open}
                                  className="role-gradient border-0 text-white"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        o.requiresAssessment && takenReport
                                          ? `Submit your application? Your verified exam score (${takenReport.scorePercent}%) and proctoring status will be attached.`
                                          : "Submit your application? This shares your portfolio and attached documents with the opportunity owner.",
                                      )
                                    )
                                      void action.run(
                                        () => applyToOpportunity(o.id),
                                        "Application submitted. Follow its progress in Applications.",
                                      );
                                  }}
                                >
                                  {applied
                                    ? "Applied"
                                    : o.requiresAssessment && takenReport
                                      ? `Apply (Exam: ${takenReport.scorePercent}%)`
                                      : open
                                        ? "Apply"
                                        : "Closed"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!visible.length && (
              <Empty
                title={
                  compose
                    ? "Your next opportunity starts here"
                    : "No published opportunities yet"
                }
                description={
                  compose
                    ? "Complete the brief above to publish your first opening."
                    : "Opportunities will appear as organizations publish them. Complete your profile to prepare for matching."
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
