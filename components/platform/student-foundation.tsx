"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { type PlatformData, type Profile } from "@/lib/platform-store";
import { Field } from "./primitives";

export function CareerPreferences({
  form,
  change,
}: {
  form: Partial<Profile>;
  change: (key: keyof Profile, value: unknown) => void;
}) {
  return (
    <fieldset className="space-y-5 rounded-2xl border border-border p-5">
      <legend className="px-2 text-sm font-semibold">Career preferences</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Shared with employers you apply to and your approved institution. These
        preferences do not establish eligibility or guarantee a match.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <PreferenceList
          label="Preferred job roles"
          value={form.preferred_roles ?? []}
          onChange={(v) => change("preferred_roles", v)}
        />
        <PreferenceList
          label="Preferred locations"
          value={form.preferred_locations ?? []}
          onChange={(v) => change("preferred_locations", v)}
        />
        <Field label="Available from">
          <input
            type="date"
            className="field"
            value={form.available_from ?? ""}
            onChange={(e) => change("available_from", e.target.value || null)}
          />
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold">
            Preferred work modes
          </legend>
          <div className="flex flex-wrap gap-4">
            {["Remote", "Hybrid", "On-site"].map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(form.preferred_work_modes ?? []).includes(mode)}
                  onChange={(e) =>
                    change(
                      "preferred_work_modes",
                      e.target.checked
                        ? [...(form.preferred_work_modes ?? []), mode]
                        : (form.preferred_work_modes ?? []).filter(
                            (v) => v !== mode,
                          ),
                    )
                  }
                />
                {mode}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </fieldset>
  );
}

function PreferenceList({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Field label={label} hint="Comma-separated; up to 20 entries.">
      <input
        className="field"
        maxLength={2000}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const entries = [
            ...new Set(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ];
          e.target.setCustomValidity(
            entries.length > 20 ? "Use no more than 20 entries." : "",
          );
          onChange(entries);
        }}
      />
    </Field>
  );
}

export function StudentSetupChecklist({ data }: { data: PlatformData }) {
  const p = data.profile;
  const records = data.records.filter((r) => r.user_id === p.id);
  const steps = [
    {
      label: "Introduce yourself",
      done: !!(p.full_name?.trim() && p.headline?.trim() && p.bio?.trim()),
      href: "/student/profile",
    },
    {
      label: "Add your education",
      done: !!(
        p.organization?.trim() &&
        p.program?.trim() &&
        p.graduation_year
      ),
      href: "/student/profile",
    },
    {
      label: "Set career preferences",
      done: !!p.preferred_roles?.length,
      href: "/student/profile",
    },
    {
      label: "Declare your skills",
      done: records.some((r) => r.kind === "skill"),
      href: "/student/profile",
    },
    {
      label: "Add a project or credential",
      done: records.some((r) => ["project", "certification"].includes(r.kind)),
      href: "/student/portfolio",
    },
    {
      label: "Connect your institution",
      done: data.memberships.some(
        (m) => m.member_id === p.id && m.status === "Approved",
      ),
      href: "/student/profile",
    },
  ];
  const complete = steps.filter((s) => s.done).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Build your student foundation</CardTitle>
        <CardDescription>
          {complete} of {steps.length} steps complete · Profile setup, not an
          employability score.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <Link
            href={step.href}
            key={step.label}
            className="glass-row flex items-center gap-3 rounded-2xl p-4 text-sm"
          >
            {step.done ? (
              <CheckCircle2
                aria-label="Complete"
                className="h-5 w-5 shrink-0 role-text"
              />
            ) : (
              <Circle
                aria-label="Not complete"
                className="h-5 w-5 shrink-0 text-muted-foreground"
              />
            )}
            <span>{step.label}</span>
            <ArrowRight
              aria-hidden="true"
              className="ml-auto h-4 w-4 shrink-0"
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function CareerPreferenceSummary({
  profile,
}: {
  profile?: Partial<Profile>;
}) {
  if (!profile || profile.preferred_roles === undefined) return null;
  const items = [
    ["Target roles", profile.preferred_roles.join(", ")],
    ["Locations", profile.preferred_locations?.join(", ")],
    ["Work modes", profile.preferred_work_modes?.join(", ")],
    ["Available from", profile.available_from],
  ].filter(([, value]) => value);
  if (!items.length) return null;
  return (
    <dl className="glass-row grid gap-2 rounded-xl p-3 text-xs sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
