"use client";
import Link from "next/link";
import { useState } from "react";
import { ClipboardCheck, Plus, Trash2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { AIScreeningAssistant } from "@/components/platform/ai-screening-assistant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { usePlatformData, isOpportunityOpen } from "@/lib/platform-store";
import {
  useIndustryAssessments,
  assessmentRequest,
  type IndustryQuestion,
  type IndustryAssessment,
  type AssessmentDefinition,
} from "@/lib/industry-assessments";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  Tag,
  useAction,
} from "./primitives";

const blankQuestion = (): IndustryQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
  skillArea: "",
  category: "Technical",
});
export function IndustryAssessmentsWorkspace({
  author = false,
}: {
  author?: boolean;
}) {
  const platform = usePlatformData();
  const assessments = useIndustryAssessments();
  const data = platform.data;
  const action = useAction();
  const [editing, setEditing] = useState<Partial<AssessmentDefinition> | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const ownOpportunities =
    data?.opportunities?.filter((o) => o.ownerId === data?.profile?.id) ?? [];
  const rows = (assessments.data ?? [])
    .filter((a) =>
      author ? a.owner_id === data?.profile?.id : a.status === "Published",
    )
    .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
  async function edit(a: IndustryAssessment, newVersion = false) {
    await action.run(
      async () => {
        const result = await assessmentRequest(
          "/api/industry-assessments/" + a.id,
        );
        setEditing(
          newVersion
            ? { ...result.definition, id: undefined, supersedes: a.id }
            : result.definition,
        );
      },
      newVersion
        ? "New version opened. The published version will remain unchanged."
        : "Draft opened.",
    );
  }
  return (
    <DashboardShell
      role={author ? "industry" : "student"}
      title={author ? "Assessment studio" : "Industry assessments"}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeading
          eyebrow={
            author ? "Define what readiness means" : "Demonstrate your skills"
          }
          title={
            author
              ? "Your requirements. Your assessment."
              : "Assess against real employer requirements."
          }
          description={
            author
              ? "Author competency-specific questions, review your answer key, and publish an immutable version linked to an opportunity."
              : "These assessments are authored and approved by the publishing industry account, not independently accredited exams."
          }
          action={
            author && (
              <Button
                className="role-gradient text-white"
                onClick={() => setEditing({})}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create assessment
              </Button>
            )
          }
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...assessments} retry={assessments.refresh} />
        {action.feedback}
        {data && !platform.error && !assessments.error && (
          <>
            {editing && author && (
              <AssessmentEditor
                key={editing.id || editing.supersedes || "new"}
                initial={editing}
                opportunities={ownOpportunities}
                onCancel={() => setEditing(null)}
                onSaved={async () => {
                  setEditing(null);
                  await assessments.refresh();
                }}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                aria-label="Search industry assessments"
                className="field sm:!w-80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find an assessment"
              />
              <p className="text-xs text-muted-foreground">
                Latest 100 accessible assessments · one scored attempt per
                version
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((a) => {
                const opportunity = data.opportunities.find(
                  (o) => o.id === a.opportunity_id,
                );
                const successor = assessments.data?.some(
                  (next) =>
                    next.supersedes === a.id && next.status === "Published",
                );
                const hasSuccessor = assessments.data?.some(
                  (next) => next.supersedes === a.id,
                );
                const report = data.reports.find(
                  (r) => r.industryAssessmentId === a.id,
                );
                const open =
                  !!opportunity &&
                  isOpportunityOpen(opportunity) &&
                  ["student", "all"].includes(opportunity.audience);
                return (
                  <Card key={a.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between gap-4">
                        <span className="rounded-2xl role-bg-soft p-3 role-text">
                          <ClipboardCheck className="h-5 w-5" />
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <Tag positive={a.status === "Published"}>
                            {a.status}
                          </Tag>
                          <Tag>Version {a.version}</Tag>
                          {successor && <Tag>Earlier version</Tag>}
                        </div>
                      </div>
                      <h2 className="mt-5 font-display text-xl font-semibold">
                        {a.title}
                      </h2>
                      <p className="mt-1 text-xs role-text">
                        {opportunity?.company} · {opportunity?.title}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {a.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>{a.question_count} questions</span>
                        <span>Employer target: {a.passing_score}%</span>
                        {a.published_at && (
                          <span>
                            Published{" "}
                            {new Date(a.published_at).toLocaleDateString(
                              "en-IN",
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 border-t border-border pt-4">
                        {author ? (
                          <Button
                            variant="outline"
                            disabled={action.busy || !!hasSuccessor}
                            onClick={() => edit(a, a.status === "Published")}
                          >
                            {hasSuccessor
                              ? "Newer version already exists"
                              : a.status === "Draft"
                                ? "Edit & review draft"
                                : "Create revised version"}
                          </Button>
                        ) : report ? (
                          <Link
                            href={"/student/report/" + report.id}
                            className="text-sm font-semibold role-text"
                          >
                            View your result · {report.scorePercent}% →
                          </Link>
                        ) : !open ? (
                          <p className="text-xs text-muted-foreground">
                            The linked opportunity is not open to students.
                          </p>
                        ) : successor ? (
                          <p className="text-xs text-muted-foreground">
                            Choose the latest published version.
                          </p>
                        ) : (
                          <Link href={"/student/industry-assessments/" + a.id}>
                            <Button className="role-gradient text-white">
                              Start or resume
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!rows.length && (
              <Empty
                title={
                  author
                    ? "Build your first industry assessment"
                    : "No industry assessments published yet"
                }
                description={
                  author
                    ? "Publish an opportunity first, then define questions that reflect its real competencies."
                    : "Employer-authored assessments will appear here when published. AI practice remains available in Skill Assessment."
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function AssessmentEditor({
  initial,
  opportunities,
  onCancel,
  onSaved,
}: {
  initial: Partial<AssessmentDefinition>;
  opportunities: Array<{
    id: string;
    title: string;
    skills?: string[];
    description?: string;
  }>;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const action = useAction();
  const [questions, setQuestions] = useState<IndustryQuestion[]>(
    initial.questions || [blankQuestion()],
  );
  const [publish, setPublish] = useState(false);
  const [titleVal, setTitleVal] = useState(initial.title || "");
  const [summaryVal, setSummaryVal] = useState(initial.summary || "");
  const [selectedOppId, setSelectedOppId] = useState(
    initial.opportunity_id || (opportunities[0]?.id ?? ""),
  );
  const selectedOpp = opportunities.find((o) => o.id === selectedOppId);

  function update(index: number, patch: Partial<IndustryQuestion>) {
    setQuestions((items) =>
      items.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function handleQuestionsGenerated(
    generatedQuestions: IndustryQuestion[],
    metadata: { title?: string; summary?: string },
  ) {
    setQuestions(generatedQuestions);
    if (!titleVal && metadata.title) {
      setTitleVal(metadata.title);
    }
    if (!summaryVal && metadata.summary) {
      setSummaryVal(metadata.summary);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border role-gradient-subtle">
        <CardTitle>
          {initial.supersedes
            ? "Revised assessment version"
            : initial.id
              ? "Edit assessment draft"
              : "Assessment builder"}
        </CardTitle>
        <CardDescription>
          Question banks are private. Publishing records your approval and locks
          this version.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const definition = {
              ...(initial.id ? { id: initial.id } : {}),
              ...(initial.supersedes ? { supersedes: initial.supersedes } : {}),
              title: titleVal || String(f.get("title")),
              summary: summaryVal || String(f.get("summary")),
              opportunity_id: selectedOppId || String(f.get("opportunity")),
              passing_score: Number(f.get("target")),
              publish,
              questions,
            };
            await action.run(
              async () => {
                await assessmentRequest("/api/industry-assessments", {
                  method: "POST",
                  body: JSON.stringify(definition),
                });
                await onSaved();
              },
              publish ? "Assessment published." : "Draft saved.",
            );
          }}
        >
          {action.feedback}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assessment title">
              <input
                className="field"
                name="title"
                required
                minLength={4}
                maxLength={160}
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                placeholder="e.g. Fullstack React & Node.js Screening"
              />
            </Field>
            <Field label="Linked opportunity">
              <select
                className="field"
                name="opportunity"
                required
                value={selectedOppId}
                onChange={(e) => setSelectedOppId(e.target.value)}
              >
                <option value="" disabled>
                  Select your opportunity
                </option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Instructions and competency expectations">
            <textarea
              className="field min-h-24"
              name="summary"
              required
              minLength={20}
              maxLength={4000}
              value={summaryVal}
              onChange={(e) => setSummaryVal(e.target.value)}
              placeholder="Explain the format, focus areas, and safe exam proctoring rules."
            />
          </Field>
          <Field
            label="Employer-defined target (%)"
            hint="Applied to the overall result and each competency; it is not a national or industry-wide benchmark."
          >
            <input
              className="field sm:!w-36"
              type="number"
              name="target"
              min={1}
              max={100}
              required
              defaultValue={initial.passing_score ?? 70}
            />
          </Field>

          {/* ── AI Question Generator Panel ── */}
          <AIScreeningAssistant
            roleTitle={selectedOpp?.title || titleVal || ""}
            skills={selectedOpp?.skills || []}
            description={selectedOpp?.description || summaryVal || ""}
            onQuestionsGenerated={handleQuestionsGenerated}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  Question Bank ({questions.length})
                  <span className="text-xs text-muted-foreground font-normal">· Max 30 questions</span>
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click the letter badge next to an option to mark it as the verified correct answer.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuestions([...questions, blankQuestion()])}
                className="text-xs h-8 cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
              </Button>
            </div>

            {questions.map((q, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm transition-all hover:border-border/80"
              >
                {/* Header: Q# + Skill Tag + Category Badge + Remove button */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-lg bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground">
                      Q{index + 1}
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
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setQuestions((items) =>
                          items.filter((_, i) => i !== index),
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
                      required
                      placeholder="e.g. Next.js, React Hooks, PostgreSQL"
                      onChange={(e) =>
                        update(index, { skillArea: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Question category">
                    <select
                      className="field text-xs cursor-pointer"
                      value={q.category}
                      onChange={(e) =>
                        update(index, {
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
                    required
                    placeholder="Scenario or practical problem statement..."
                    onChange={(e) =>
                      update(index, { question: e.target.value })
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
                              update(index, { correctAnswer: oIdx })
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
                            required
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[oIdx] = e.target.value;
                              update(index, { options: newOpts });
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
                    required
                    value={q.explanation}
                    placeholder="Why is this answer correct? Explain the architectural or domain justification."
                    onChange={(e) =>
                      update(index, { explanation: e.target.value })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={questions.length >= 30 || action.busy}
            onClick={() => setQuestions((items) => [...items, blankQuestion()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add question ({questions.length}/30)
          </Button>
          <label className="flex items-start gap-3 rounded-2xl role-bg-soft p-4">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold">
                I reviewed the questions, answer key, and target. Publish this
                version.
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Publishing locks the content. Students get one scored attempt
                per version; answer explanations become visible to them after
                submission. This is an unproctored assessment, not an accredited
                certificate.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={action.busy || !opportunities.length}
              className="role-gradient text-white"
            >
              {action.busy
                ? "Saving…"
                : publish
                  ? "Approve & publish"
                  : "Save draft"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
          {!opportunities.length && (
            <p className="text-sm text-muted-foreground">
              Create an opportunity in Post Opportunity before saving an
              assessment.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
