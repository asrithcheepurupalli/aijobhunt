"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { linkify } from "@/components/linkify";
import type { AppState, ChatMessage, MatchStatus } from "@/lib/types";

const EMPTY: AppState = { profile: {}, messages: [], matches: [] };

export default function Home() {
  const [state, setState] = useState<AppState>(EMPTY);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Load state on mount (also seeds the greeting).
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((s: AppState) => {
        setState(s);
        scrollToBottom();
      })
      .catch(() => setError("couldn't load — is the server running?"));
  }, [scrollToBottom]);

  useEffect(scrollToBottom, [state.messages.length, sending, scrollToBottom]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");

    // Optimistically show the user's message.
    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, optimistic] }));
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "request failed");
      }
      setState(data.state as AppState);
    } catch (e) {
      setError((e as Error).message);
      // Roll back the optimistic message on failure.
      setState((s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== optimistic.id),
      }));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const onAction = useCallback(async (id: string, status: MatchStatus) => {
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) return;
      // Refresh state to reflect the new status.
      const s = await fetch("/api/state").then((r) => r.json());
      setState(s as AppState);
    } catch {
      /* ignore */
    }
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <main className="mx-auto flex h-screen max-w-6xl flex-col p-0 md:p-6">
      <div className="flex h-full overflow-hidden rounded-none border-gray-200 bg-white md:rounded-2xl md:border md:shadow-sm">
        {/* Chat column */}
        <div className="flex h-full min-w-0 flex-1 flex-col border-r border-gray-200">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-backdoor-red text-lg">
              👻
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight">your hiring agent</div>
              <div className="text-xs text-gray-500">
                sources roles · drafts outreach · you approve everything
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {state.messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`bubble ${m.role === "user" ? "bubble-out" : "bubble-in"}`}
                >
                  {linkify(m.text)}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bubble bubble-in typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="message your agent…"
                className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-[15px] outline-none focus:border-imessage-blue"
              />
              <button
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-imessage-blue text-white disabled:opacity-40"
                aria-label="send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard column */}
        <div className="hidden h-full w-[360px] shrink-0 md:block">
          <Dashboard state={state} onAction={onAction} />
        </div>
      </div>
    </main>
  );
}
