"use client";

import { useState } from "react";
import type { AppState, Match, MatchStatus } from "@/lib/types";

function fitColor(label: Match["fitLabel"]): string {
  if (label === "strong fit") return "bg-green-100 text-green-800";
  if (label === "good fit") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

function statusBadge(status: MatchStatus): { text: string; cls: string } {
  switch (status) {
    case "approved":
      return { text: "ready to send", cls: "bg-green-600 text-white" };
    case "sent":
      return { text: "sent", cls: "bg-green-700 text-white" };
    case "skipped":
      return { text: "skipped", cls: "bg-gray-300 text-gray-600" };
    default:
      return { text: "new", cls: "bg-amber-100 text-amber-800" };
  }
}

function mailtoHref(m: Match): string {
  const to = m.founderEmail ?? "";
  const params = new URLSearchParams({
    subject: m.draftSubject,
    body: m.draftBody,
  });
  return `mailto:${to}?${params.toString()}`;
}

export function Dashboard({
  state,
  onAction,
}: {
  state: AppState;
  onAction: (id: string, status: MatchStatus) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { profile, matches } = state;

  const sorted = [...matches].sort((a, b) => b.fitScore - a.fitScore);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold">pipeline</h2>
        <p className="text-xs text-gray-500">
          every match, draft, and status — full traceability
        </p>
      </div>

      <div className="scroll flex-1 overflow-y-auto px-5 py-4">
        {/* Profile snapshot */}
        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            profile
          </h3>
          {profile.name || profile.positioning ? (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
              {profile.name && (
                <div className="font-semibold">{profile.name}</div>
              )}
              {profile.positioning && (
                <div className="mt-0.5 text-gray-700">{profile.positioning}</div>
              )}
              {profile.location && (
                <div className="mt-1 text-xs text-gray-500">
                  📍 {profile.location}
                </div>
              )}
              {profile.priorities && profile.priorities.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">priorities:</span>{" "}
                  {profile.priorities.slice(0, 3).join(" · ")}
                </div>
              )}
              {profile.targetCriteria && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">hunting for:</span>{" "}
                  {profile.targetCriteria}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-400">
              nothing saved yet — start the chat →
            </div>
          )}
        </section>

        {/* Matches */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            matches ({matches.length})
          </h3>
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-400">
              no matches sourced yet
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((m) => {
                const badge = statusBadge(m.status);
                const isOpen = expanded === m.id;
                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-gray-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{m.company}</div>
                        <div className="text-xs text-gray-500">{m.roleTitle}</div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${fitColor(m.fitLabel)}`}
                      >
                        {m.fitLabel} · {m.fitScore}
                      </span>
                      {m.stage && (
                        <span className="text-[10px] text-gray-500">{m.stage}</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-600">{m.whyFit}</p>

                    <button
                      className="mt-2 text-xs font-medium text-imessage-blue"
                      onClick={() => setExpanded(isOpen ? null : m.id)}
                    >
                      {isOpen ? "hide draft" : "view draft"}
                    </button>

                    {isOpen && (
                      <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs">
                        <div className="text-gray-500">
                          To: {m.founderName ?? "(founder)"}{" "}
                          {m.founderEmail ? `<${m.founderEmail}>` : "(no email found)"}
                        </div>
                        <div className="mt-1 font-medium">
                          Subject: {m.draftSubject}
                        </div>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-700">
                          {m.draftBody}
                        </pre>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onAction(m.id, "approved")}
                        disabled={m.status === "approved"}
                        className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        approve
                      </button>
                      <a
                        href={mailtoHref(m)}
                        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700"
                      >
                        open in mail
                      </a>
                      <button
                        onClick={() => onAction(m.id, "skipped")}
                        disabled={m.status === "skipped"}
                        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-500 disabled:opacity-40"
                      >
                        skip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
