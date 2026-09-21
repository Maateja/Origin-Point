"use client";
import { useRef, useState } from "react";
import { Download, ExternalLink, FileCheck2, Plus, Trash2 } from "lucide-react";
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
  type PlatformData,
  type PortfolioRecord,
} from "@/lib/platform-store";
import { SkillPassport } from "./skill-passport";
import { DocumentLink } from "./document-link";
import { Empty, Field, SaveButton, Tag, useAction } from "./primitives";
export function RecordManager({ data }: { data: PlatformData }) {
  const records = data.records.filter((r) => r.user_id === data.profile.id);
  const action = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<PortfolioRecord["kind"]>("certification");
  const [filter, setFilter] = useState("All");
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
            <CardTitle className="text-base">Add a record</CardTitle>
            <CardDescription>
              Documents are access-controlled and shared with your opportunity
              owners and approved institution. Keep the issuer link for
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
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
                };
                if (
                  await action.run(
                    () => addRecord(input, file?.size ? file : null),
                    "Record saved.",
                  )
                )
                  formRef.current?.reset();
              }}
            >
              <Field label="Record type">
                <select
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
                  required
                  maxLength={160}
                  className="field"
                />
              </Field>
              <Field label="Organization / issuer">
                <input name="organization" maxLength={160} className="field" />
              </Field>
              <Field label="Description">
                <textarea
                  name="description"
                  maxLength={4000}
                  className="field min-h-24"
                />
              </Field>
              <Field label="Evidence URL">
                <input
                  name="url"
                  type="url"
                  pattern="https?://.*"
                  placeholder="https://"
                  className="field"
                />
              </Field>
              <Field label="Date issued / completed">
                <input name="issued_on" type="date" className="field" />
              </Field>
              <Field label="Expiry date (if applicable)">
                <input name="expires_on" type="date" className="field" />
              </Field>
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
              <SaveButton busy={action.busy}>
                <Plus className="mr-2 h-4 w-4" />
                Save record
              </SaveButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
