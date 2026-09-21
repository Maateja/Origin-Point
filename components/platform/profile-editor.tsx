"use client";
import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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
  ownSkills,
  requestMembership,
  saveProfile,
  usePlatformData,
  type Profile,
  type Role,
} from "@/lib/platform-store";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
import { RecordManager } from "./record-manager";

export function ProfileEditor({ role }: { role: Role }) {
  const state = usePlatformData();
  const data = state.data;
  const action = useAction();
  const [form, setForm] = useState<Partial<Profile>>({});
  const [interests, setInterests] = useState("");
  const [skill, setSkill] = useState("");
  const [institution, setInstitution] = useState("");
  const [loadedId, setLoadedId] = useState("");
  useEffect(() => {
    if (data && loadedId !== data.profile.id) {
      setForm(data.profile);
      setInterests(data.profile.interests.join(", "));
      setLoadedId(data.profile.id);
    }
  }, [data, loadedId]);
  const change = (key: keyof Profile, value: unknown) =>
    setForm((old) => ({ ...old, [key]: value }));
  const skills = ownSkills(data);
  const completeness = data
    ? Math.round(
        ([
          data.profile.full_name,
          data.profile.headline,
          data.profile.bio,
          data.profile.location,
          data.profile.organization,
          skills.length,
        ].filter(Boolean).length /
          6) *
          100,
      )
    : 0;
  return (
    <DashboardShell role={role} title="Profile">
      <div className="space-y-6">
        <PageHeading
          eyebrow={`${role} identity`}
          title="A profile that grows with you."
          description="Keep your details, expertise, and evidence together. Every saved change follows your account across devices."
        />
        <DataState {...state} retry={state.refresh} />
        {data && !state.error && (
          <>
            {action.feedback}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,.7fr)]">
              <Card className="overflow-hidden">
                <div className="h-20 role-gradient opacity-90" />
                <CardHeader>
                  <div className="-mt-12 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-card bg-card shadow-sm">
                    <UserRound className="h-7 w-7 role-text" />
                  </div>
                  <CardTitle>Your details</CardTitle>
                  <CardDescription>
                    {role === "student"
                      ? "Introduce your education and career direction."
                      : role === "academician"
                        ? "Share your teaching, research, and industry interests."
                        : "Introduce your organization and the work you do."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-5"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await action.run(() =>
                        saveProfile({
                          ...form,
                          interests: interests
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }),
                      );
                    }}
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      {(
                        [
                          ["full_name", "Full name"],
                          [
                            "organization",
                            role === "industry"
                              ? "Company name"
                              : role === "institution"
                                ? "Institution name"
                                : "Institution / organization",
                          ],
                          ["headline", "Professional headline"],
                          ["location", "Location"],
                          [
                            "department",
                            role === "industry"
                              ? "Division / sector"
                              : "Department",
                          ],
                          [
                            "program",
                            role === "student"
                              ? "Degree / program"
                              : "Designation / specialization",
                          ],
                        ] as const
                      ).map(([key, label]) => (
                        <Field key={key} label={label}>
                          <input
                            className="field"
                            required={key === "full_name"}
                            maxLength={160}
                            value={String(form[key] ?? "")}
                            onChange={(e) => change(key, e.target.value)}
                          />
                        </Field>
                      ))}
                      {role === "student" && (
                        <Field label="Graduation year">
                          <input
                            className="field"
                            type="number"
                            min="1950"
                            max="2100"
                            value={form.graduation_year ?? ""}
                            onChange={(e) =>
                              change(
                                "graduation_year",
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                          />
                        </Field>
                      )}
                      <Field label="Website">
                        <input
                          className="field"
                          type="url"
                          placeholder="https://"
                          value={form.website ?? ""}
                          onChange={(e) => change("website", e.target.value)}
                        />
                      </Field>
                    </div>
                    <Field label="About">
                      <textarea
                        className="field min-h-32"
                        maxLength={4000}
                        value={form.bio ?? ""}
                        onChange={(e) => change("bio", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Career interests / focus areas"
                      hint="Separate interests with commas."
                    >
                      <input
                        className="field"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                      />
                    </Field>
                    <label className="flex items-start gap-3 rounded-2xl border border-border p-4">
                      <input
                        type="checkbox"
                        checked={form.discoverable ?? false}
                        onChange={(e) =>
                          change("discoverable", e.target.checked)
                        }
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <span className="font-semibold">
                          Make my professional profile discoverable
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          Signed-in members can find your name, bio,
                          organization, and skills. Your email is not listed.
                          Applying shares your portfolio and attached documents
                          with the opportunity owner. An approved institution
                          can also view your portfolio, documents, and learning
                          progress.
                        </span>
                      </span>
                    </label>
                    <SaveButton busy={action.busy}>
                      <Save className="mr-2 h-4 w-4" />
                      Save profile
                    </SaveButton>
                  </form>
                </CardContent>
              </Card>
              <div className="space-y-5">
                <Card className="role-gradient-subtle">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Profile completeness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-display text-4xl font-bold">
                      {completeness}%
                    </p>
                    <div className="my-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full role-gradient"
                        style={{ width: completeness + "%" }}
                      />
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Based on your saved name, headline, bio, location,
                      organization, and skills.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Skills & expertise
                    </CardTitle>
                    <CardDescription>
                      Self-reported skills inform matching.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <Tag key={s}>{s}</Tag>
                      ))}
                      {!skills.length && (
                        <p className="text-sm text-muted-foreground">
                          Add your first skill.
                        </p>
                      )}
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await action.run(
                            () => addRecord({ kind: "skill", title: skill }),
                            "Skill saved.",
                          )
                        )
                          setSkill("");
                      }}
                      className="flex gap-2"
                    >
                      <input
                        required
                        aria-label="New skill"
                        maxLength={100}
                        className="field min-w-0"
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                        placeholder="Add a skill"
                      />
                      <Button
                        disabled={action.busy}
                        type="submit"
                        variant="outline"
                      >
                        Add
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {["student", "academician"].includes(role) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Connect your institution
                      </CardTitle>
                      <CardDescription>
                        Your institution approves access to your progress.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.memberships
                        .filter((m) => m.member_id === data.profile.id)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="flex justify-between gap-2 text-xs"
                          >
                            <span>
                              {data.directory.find(
                                (p) => p.id === m.institution_id,
                              )?.organization ||
                                data.directory.find(
                                  (p) => p.id === m.institution_id,
                                )?.full_name ||
                                "Institution"}
                            </span>
                            <Tag>{m.status}</Tag>
                          </div>
                        ))}
                      <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await action.run(
                            () => requestMembership(institution),
                            "Membership request sent.",
                          );
                        }}
                      >
                        <select
                          required
                          aria-label="Institution"
                          className="field"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                        >
                          <option value="">Choose an institution</option>
                          {data.directory
                            .filter(
                              (p) =>
                                p.role === "institution" &&
                                !data.memberships.some(
                                  (m) => m.institution_id === p.id,
                                ),
                            )
                            .map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.organization || p.full_name}
                              </option>
                            ))}
                        </select>
                        <SaveButton busy={action.busy}>
                          Request membership
                        </SaveButton>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            <RecordManager data={data} />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
