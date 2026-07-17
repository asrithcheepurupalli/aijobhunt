"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mark } from "@/components/Mark";
import type { Profile } from "@/lib/types";

// Turn a textarea (one item per line) into a trimmed array, and back.
const toLines = (arr?: string[]) => (arr ?? []).join("\n");
const fromLines = (v: string): string[] =>
  v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

type FormState = {
  name: string;
  targetRole: string;
  positioning: string;
  proudestOf: string;
  priorities: string; // textarea
  links: string; // textarea
  location: string;
  remoteOnly: boolean;
  offLimits: string; // textarea
  dealbreakers: string; // textarea
  targetCriteria: string;
  emailStyle: string;
  summary: string;
  strongestSignals: string; // textarea
  dossier: string;
};

function toForm(p: Profile): FormState {
  return {
    name: p.name ?? "",
    targetRole: p.targetRole ?? "",
    positioning: p.positioning ?? "",
    proudestOf: p.proudestOf ?? "",
    priorities: toLines(p.priorities),
    links: toLines(p.links),
    location: p.location ?? "",
    remoteOnly: p.remoteOnly ?? false,
    offLimits: toLines(p.offLimits),
    dealbreakers: toLines(p.dealbreakers),
    targetCriteria: p.targetCriteria ?? "",
    emailStyle: p.emailStyle ?? "",
    summary: p.summary ?? "",
    strongestSignals: toLines(p.strongestSignals),
    dossier: p.dossier ?? "",
  };
}

function toPatch(f: FormState) {
  return {
    name: f.name.trim(),
    targetRole: f.targetRole.trim(),
    positioning: f.positioning.trim(),
    proudestOf: f.proudestOf.trim(),
    priorities: fromLines(f.priorities),
    links: fromLines(f.links),
    location: f.location.trim(),
    remoteOnly: f.remoteOnly,
    offLimits: fromLines(f.offLimits),
    dealbreakers: fromLines(f.dealbreakers),
    targetCriteria: f.targetCriteria.trim(),
    emailStyle: f.emailStyle.trim(),
    summary: f.summary.trim(),
    strongestSignals: fromLines(f.strongestSignals),
    dossier: f.dossier.trim(),
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState<FormState | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [researching, setResearching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: { profile: Profile }) => {
        setProfile(d.profile);
        const f = toForm(d.profile);
        setForm(f);
        setSaved(f);
      })
      .catch(() => setMsg("couldn't load your profile."));
  }, []);

  const dirty = useMemo(
    () => form && saved && JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setStatus("idle");
  };

  const save = useCallback(async () => {
    if (!form) return;
    setStatus("saving");
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPatch(form)),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "save failed");
      setProfile(d.profile as Profile);
      const f = toForm(d.profile as Profile);
      setForm(f);
      setSaved(f);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  }, [form]);

  const rerun = useCallback(async () => {
    setResearching(true);
    setMsg(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "research failed");
      const p = d.profile as Profile;
      setProfile(p);
      // Keep the user's unsaved edits to told-us fields, but refresh the
      // research-generated ones from the new run.
      setForm((f) =>
        f
          ? {
              ...f,
              summary: p.summary ?? "",
              strongestSignals: toLines(p.strongestSignals),
              dossier: p.dossier ?? "",
            }
          : f,
      );
      setSaved((s) =>
        s
          ? {
              ...s,
              summary: p.summary ?? "",
              strongestSignals: toLines(p.strongestSignals),
              dossier: p.dossier ?? "",
            }
          : s,
      );
      setMsg("research refreshed from your links.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setResearching(false);
    }
  }, []);

  if (!form || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center text-gray-400">
        loading your profile…
      </div>
    );
  }

  const researchedAt = profile.researchUpdatedAt
    ? new Date(profile.researchUpdatedAt).toLocaleString()
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f7" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF4E2B] text-white"
              aria-label="back to chat"
            >
              <Mark size={16} />
            </Link>
            <span className="text-[15px] font-semibold">foothold</span>
            <span className="text-gray-300">/</span>
            <span className="text-[15px] text-gray-500">profile</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-sm text-gray-500 hover:text-gray-900">
              ← chat
            </Link>
            <button
              onClick={() => void save()}
              disabled={!dirty || status === "saving"}
              className="rounded-full bg-[#FF4E2B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {status === "saving"
                ? "saving…"
                : status === "saved" && !dirty
                  ? "saved ✓"
                  : "save changes"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* Intro */}
        <div className="mb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF4E2B]">
            what foothold knows about you
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-gray-500">
            This is exactly what the agent carries about you and uses to match you
            with startups and write your outreach. Edit anything — your changes
            stick until you re-run research.
          </p>
        </div>

        {msg && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            {msg}
          </div>
        )}

        {/* WHAT YOU'VE TOLD US */}
        <Section
          title="What you've told us"
          hint="The basics. These drive who Foothold reaches out to."
        >
          <Field label="Full name">
            <Input value={form.name} onChange={(v) => set("name", v)} />
          </Field>
          <Field
            label="Target role"
            hint="e.g. Founding Design Engineer, Marketing / GTM, Product Manager"
          >
            <Input value={form.targetRole} onChange={(v) => set("targetRole", v)} />
          </Field>
          <Field label="Your one-liner" hint="How you'd describe yourself in a sentence.">
            <Input value={form.positioning} onChange={(v) => set("positioning", v)} />
          </Field>
          <Field label="Proudest thing you've built or shipped">
            <Textarea
              rows={2}
              value={form.proudestOf}
              onChange={(v) => set("proudestOf", v)}
            />
          </Field>
          <Field label="What matters to you" hint="One per line — e.g. learning, equity, mission.">
            <Textarea
              rows={4}
              value={form.priorities}
              onChange={(v) => set("priorities", v)}
            />
          </Field>
          <Field label="Your links" hint="One URL per line — LinkedIn, portfolio, GitHub, resume.">
            <Textarea rows={4} value={form.links} onChange={(v) => set("links", v)} />
          </Field>
        </Section>

        {/* PREFERENCES */}
        <Section
          title="Preferences"
          hint="What Foothold filters for and how it writes."
        >
          <Field label="Location">
            <Input value={form.location} onChange={(v) => set("location", v)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.remoteOnly}
              onChange={(e) => set("remoteOnly", e.target.checked)}
              className="h-4 w-4 accent-[#FF4E2B]"
            />
            Remote only
          </label>
          <Field label="Off-limits" hint="Companies to never contact — one per line.">
            <Textarea rows={3} value={form.offLimits} onChange={(v) => set("offLimits", v)} />
          </Field>
          <Field label="Dealbreakers" hint="Anything that's a hard no — one per line.">
            <Textarea
              rows={3}
              value={form.dealbreakers}
              onChange={(v) => set("dealbreakers", v)}
            />
          </Field>
          <Field
            label="Targeting notes"
            hint="Stage, industries, role types, comp, dealbreakers — anything that narrows the search."
          >
            <Textarea
              rows={4}
              value={form.targetCriteria}
              onChange={(v) => set("targetCriteria", v)}
            />
          </Field>
          <Field
            label="Email style"
            hint="Tone, openers, banned phrases, sign-off — how your emails should read."
          >
            <Textarea
              rows={4}
              value={form.emailStyle}
              onChange={(v) => set("emailStyle", v)}
            />
          </Field>
        </Section>

        {/* WHAT FOOTHOLD USES TO PITCH YOU */}
        <Section
          title="What Foothold uses to pitch you"
          hint="The agent generates this from your links. It's the source of truth for your cold emails — edit it directly if anything's off."
        >
          <Field label="Summary">
            <Textarea rows={4} value={form.summary} onChange={(v) => set("summary", v)} />
          </Field>
          <Field label="Strongest signals" hint="Your standout proof points — one per line.">
            <Textarea
              rows={5}
              value={form.strongestSignals}
              onChange={(v) => set("strongestSignals", v)}
            />
          </Field>
          <Field label="Full dossier" hint="The complete profile used when drafting founder emails.">
            <Textarea rows={8} value={form.dossier} onChange={(v) => set("dossier", v)} />
          </Field>
        </Section>

        {/* RESEARCH NOTES (read-only) */}
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                research notes
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Generated from your links — read-only.
              </p>
            </div>
            {profile.researchConfidence && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                confidence: {profile.researchConfidence}
              </span>
            )}
          </div>

          {researchedAt && (
            <div className="mt-3 text-xs text-gray-400">
              Last updated: {researchedAt}
            </div>
          )}

          {profile.research && (
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-gray-700">
              {profile.research}
            </pre>
          )}

          {profile.researchOpenQuestions &&
            profile.researchOpenQuestions.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700">
                  Open questions:
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                  {profile.researchOpenQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

          {!profile.research && (
            <p className="mt-3 text-sm text-gray-400">
              no research yet — add links above, save, then re-run research.
            </p>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <button
              onClick={() => void rerun()}
              disabled={researching}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-800 disabled:opacity-50"
            >
              {researching ? "researching…" : "re-run research"}
            </button>
            <p className="mt-2 text-xs text-gray-400">
              Pulls fresh findings from your links and replaces the
              research-generated fields above.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---- small presentational pieces ---- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-800">{label}</label>
      {hint && <p className="mb-1 mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className={hint ? "" : "mt-1"}>{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[15px] outline-none focus:border-[#FF4E2B]"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-[#FF4E2B]"
    />
  );
}
