"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileCheck2,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addRecord,
  documentUrl,
  exportRecords,
  removeRecord,
  updateRecord,
  type PlatformData,
  type PortfolioRecord,
} from "@/lib/platform-store";
import { SkillPassport } from "./skill-passport";
import { ProgramCompletions } from "./program-completions";
import { useApplicationTracking } from "@/lib/application-tracking";
import { SkillSuggestions } from "./skill-suggestions";
import { DocumentLink } from "./document-link";
import { Empty, Field, SaveButton, Tag, useAction } from "./primitives";
export function RecordManager({ data }: { data: PlatformData }) {
  const tracking = useApplicationTracking();
  const records = data.records.filter((r) => r.user_id === data.profile.id);
  const action = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<PortfolioRecord["kind"]>("certification");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<PortfolioRecord | null>(null);
  const foundationReady = data.profile.preferred_roles !== undefined;
  const kinds = [
    "skill",
    "certification",
    "project",
    "education",
    "experience",
    "achievement",
    "document",
  ] as const;
  const visible =
    filter === "All" ? records : records.filter((r) => r.kind === filter);
  return (
    <section className="space-y-5">
      {data.profile.role === "student" && <SkillPassport data={data} />}
      {["student", "academician"].includes(data.profile.role) && (
        <ProgramCompletions userId={data.profile.id} role={data.profile.role} />
      )}
      {data.applications.some(
        (a) =>
          a.applicantId === data.profile.id &&
          a.status === "Completed" &&
          data.opportunities.some(
            (o) =>
              o.id === a.opportunityId &&
              [
                "Internship",
                "Apprenticeship",
                "Live Project",
                "Faculty Internship",
              ].includes(o.type),
          ),
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>Completed industry experiences</CardTitle>
            <CardDescription>
              Completion recorded by the opportunity owner. This is not an
              independently verified certificate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.applications
              .filter(
                (a) =>
                  a.applicantId === data.profile.id && a.status === "Completed",
              )
              .map((a) => {
                const opportunity = data.opportunities.find(
                  (o) =>
                    o.id === a.opportunityId &&
                    [
                      "Internship",
                      "Apprenticeship",
                      "Live Project",
                      "Faculty Internship",
                    ].includes(o.type),
                );
                return opportunity ? (
                  <Link
                    key={a.id}
                    href="/student/internships"
                    className="glass-row block rounded-2xl p-4"
                  >
                    <p className="font-semibold">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {opportunity.company} · {opportunity.type} ·
                      {tracking.data?.completions.some(
                        (c) => c.application_id === a.id,
                      )
                        ? "Report-reviewed completion"
                        : "Employer-marked completed"}
                    </p>
                  </Link>
                ) : null;
              })}
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest role-text">
            Your evidence library
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Credentials, projects & milestones
          </h2>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportRecords("origin-point-portfolio.json", {
              profile: data.profile,
              records: records.map(({ document_path, ...r }) => r),
            })
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Export portfolio
        </Button>
      </div>
      {action.feedback}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["All", ...kinds].map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs capitalize " +
                  (filter === k
                    ? "role-gradient border-transparent text-white"
                    : "border-border text-muted-foreground")
                }
              >
                {k}
              </button>
            ))}
          </div>
          {visible.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl role-bg-soft p-3 role-text">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{r.title}</h3>
                      <Tag>{r.kind}</Tag>
                      {r.verified_at && <Tag positive>Verified</Tag>}
                      {r.proficiency && (
                        <Tag>{r.proficiency} · self-declared</Tag>
                      )}
                      {r.expires_on &&
                        r.expires_on <
                          new Date().toISOString().slice(0, 10) && (
                          <Tag>Expired</Tag>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.organization}
                      {r.issued_on ? " · " + r.issued_on : ""}
                    </p>
                    {r.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                    {r.credential_id && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Credential ID: {r.credential_id}
                      </p>
                    )}
                    {r.contribution && (
                      <p className="mt-3 whitespace-pre-wrap text-sm">
                        <strong>My contribution: </strong>
                        {r.contribution}
                      </p>
                    )}
                    {!!r.associated_skills?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.associated_skills.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                    )}
                    {r.expires_on && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Expiry: {r.expires_on}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {r.url && (
                        <a
                          className="inline-flex items-center gap-1 text-xs font-semibold role-text"
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View evidence
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {r.document_path && (
                        <DocumentLink path={r.document_path} />
                      )}
                      {!r.verified_at && (
                        <span className="text-[11px] text-muted-foreground">
                          Self-reported · not independently verified
                        </span>
                      )}
                    </div>
                  </div>
                  {foundationReady && !r.verified_at && (
                    <Button
                      aria-label={"Edit " + r.title}
                      size="icon"
                      variant="ghost"
                      disabled={action.busy}
                      onClick={() => {
                        setEditing(r);
                        setKind(r.kind);
                        formRef.current?.scrollIntoView({ block: "center" });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    aria-label={"Delete " + r.title}
                    size="icon"
                    variant="ghost"
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this record" +
                            (r.document_path ? " and its attached file" : "") +
                            "?",
                        )
                      )
                        void action.run(
                          () => removeRecord(r),
                          "Record removed.",
                        );
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!visible.length && (
            <Empty
              title="Make your work visible"
              description="Add your actual qualifications, projects, and achievements. They will appear here as you save them."
            />
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? "Edit record" : "Add a record"}
            </CardTitle>
            <CardDescription>
              Documents are access-controlled and shared with your opportunity
              owners and approved institution. Keep the issuer link for
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={editing?.id ?? "new"}
              ref={formRef}
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const file = fd.get("file") as File | null;
                const input = {
                  kind,
                  title: String(fd.get("title") || ""),
                  organization: String(fd.get("organization") || ""),
                  description: String(fd.get("description") || ""),
                  url: String(fd.get("url") || ""),
                  issued_on: String(fd.get("issued_on") || ""),
                  expires_on: String(fd.get("expires_on") || ""),
                  ...(foundationReady
                    ? {
                        proficiency: String(
                          fd.get("proficiency") || "",
                        ) as PortfolioRecord["proficiency"],
                        associated_skills: [
                          ...new Set(
                            String(fd.get("associated_skills") || "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          ),
                        ],
                        credential_id: String(fd.get("credential_id") || ""),
                        contribution: String(fd.get("contribution") || ""),
                      }
                    : {}),
                };
                if (
                  await action.run(
                    () =>
                      editing
                        ? updateRecord(editing, input)
                        : addRecord(input, file?.size ? file : null),
                    "Record saved.",
                  )
                ) {
                  formRef.current?.reset();
                  setEditing(null);
                }
              }}
            >
              <Field label="Record type">
                <select
                  disabled={!!editing || action.busy}
                  className="field"
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as PortfolioRecord["kind"])
                  }
                >
                  {kinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  name="title"
                  list={
                    kind === "skill" ? "portfolio-skill-options" : undefined
                  }
                  defaultValue={editing?.title ?? ""}
                  required
                  maxLength={160}
                  className="field"
                />
              </Field>
              <Field label="Organization / issuer">
                <SkillSuggestions id="portfolio-skill-options" />
                <input
                  name="organization"
                  defaultValue={editing?.organization ?? ""}
                  maxLength={160}
                  className="field"
                />
              </Field>
              <Field label="Description">
                <textarea
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  maxLength={4000}
                  className="field min-h-24"
                />
              </Field>
              <Field label="Evidence URL">
                <input
                  name="url"
                  defaultValue={editing?.url ?? ""}
                  type="url"
                  pattern="https?://.*"
                  placeholder="https://"
                  className="field"
                />
              </Field>
              <Field label="Date issued / completed">
                <input
                  name="issued_on"
                  defaultValue={editing?.issued_on ?? ""}
                  type="date"
                  className="field"
                />
              </Field>
              <Field label="Expiry date (if applicable)">
                <input
                  name="expires_on"
                  defaultValue={editing?.expires_on ?? ""}
                  type="date"
                  className="field"
                />
              </Field>
              {foundationReady && (
                <>
                  {kind === "skill" && (
                    <Field label="Self-declared proficiency">
                      <select
                        name="proficiency"
                        className="field"
                        defaultValue={editing?.proficiency ?? ""}
                      >
                        <option value="">Not specified</option>
                        {["Beginner", "Intermediate", "Advanced"].map(
                          (level) => (
                            <option key={level}>{level}</option>
                          ),
                        )}
                      </select>
                    </Field>
                  )}
                  {kind === "certification" && (
                    <Field label="Credential ID">
                      <input
                        name="credential_id"
                        maxLength={200}
                        defaultValue={editing?.credential_id ?? ""}
                        className="field"
                      />
                    </Field>
                  )}
                  {kind === "project" && (
                    <Field label="Your contribution">
                      <textarea
                        name="contribution"
                        maxLength={2000}
                        defaultValue={editing?.contribution ?? ""}
                        className="field"
                      />
                    </Field>
                  )}
                  {kind !== "skill" && (
                    <Field
                      label="Related skills"
                      hint="Comma-separated; up to 20. These do not automatically become assessed skills."
                    >
                      <input
                        name="associated_skills"
                        maxLength={2000}
                        defaultValue={
                          editing?.associated_skills?.join(", ") ?? ""
                        }
                        className="field"
                      />
                    </Field>
                  )}
                </>
              )}
              {!foundationReady && (
                <p className="text-xs text-muted-foreground">
                  Record editing and richer evidence fields require the
                  student-foundation database update.
                </p>
              )}
              {!editing && (
                <Field
                  label="Attach a document"
                  hint="PDF, JPG, PNG, or WebP · up to 10 MB"
                >
                  <input
                    name="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2"
                  />
                </Field>
              )}
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Existing attachments are preserved. To replace a document, add
                  a new record.
                </p>
              )}
              <SaveButton busy={action.busy}>
                <Plus className="mr-2 h-4 w-4" />
                Save record
              </SaveButton>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={action.busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel editing
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
