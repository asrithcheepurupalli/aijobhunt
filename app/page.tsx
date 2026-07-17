"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/Mark";

type Theme = "light" | "dark" | null;

// Small scroll-reveal: adds `.in` to any `.reveal` element as it enters view.
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const CHAT: { role: "in" | "out"; text: string; fit?: string }[] = [
  {
    role: "in",
    text:
      "hey! i'm foothold — i help you land roles at early-stage startups. figuring out where you fit, then getting you in front of the right founders.",
  },
  { role: "in", text: "what's your name?" },
  { role: "out", text: "asrith" },
  {
    role: "in",
    text:
      "solid. drop me your portfolio or github — i'll dig into your actual work before we talk roles.",
  },
  { role: "out", text: "asrithcheepurupalli.tech" },
  { role: "in", text: "on it — reading through your sites now…" },
  {
    role: "in",
    text:
      "new match — Fastshot (strong fit). YC team building “lovable for mobile apps,” no designer yet. your prompt-to-product work is the exact unlock. want the draft?",
    fit: "fit 82",
  },
];

export default function Landing() {
  const [theme, setTheme] = useState<Theme>(null);
  useReveal();

  useEffect(() => {
    const saved = window.localStorage.getItem("foothold-theme") as Theme;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggleTheme = () => {
    // Resolve the currently-shown theme, then flip it.
    const systemDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    const current = theme ?? (systemDark ? "dark" : "light");
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("foothold-theme", next);
  };

  return (
    <div className="landing" data-theme={theme ?? undefined}>
      {/* faint accent glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(60rem 40rem at 78% -10%, var(--glow), transparent 60%)",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* ---- Nav ---- */}
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
            <Mark size={22} />
            <span
              className="text-[19px] font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              foothold
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="#how"
              className="hidden px-3 py-2 text-sm sm:block"
              style={{ color: "var(--muted)" }}
            >
              how it works
            </a>
            <a
              href="#pipeline"
              className="hidden px-3 py-2 text-sm sm:block"
              style={{ color: "var(--muted)" }}
            >
              the pipeline
            </a>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
              aria-label="toggle theme"
            >
              <ThemeGlyph />
            </button>
            <Link href="/app" className="l-btn l-btn-primary text-sm">
              open foothold
            </Link>
          </div>
        </nav>

        {/* ---- Hero ---- */}
        <header className="mx-auto max-w-5xl px-6 pb-8 pt-10 sm:pt-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div
                className="animate-up l-chip"
                style={{ animationDelay: "0.02s" }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: "var(--accent)",
                    display: "inline-block",
                  }}
                />
                your personal startup-hiring agent
              </div>

              <h1
                className="animate-up mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[54px]"
                style={{ animationDelay: "0.08s" }}
              >
                Land a founding role
                <br />
                at a startup{" "}
                <span className="serif italic" style={{ color: "var(--accent)" }}>
                  worth betting on.
                </span>
              </h1>

              <p
                className="animate-up mt-5 max-w-md text-[17px] leading-relaxed"
                style={{ animationDelay: "0.16s", color: "var(--muted)" }}
              >
                Startup hiring isn&apos;t a numbers game — focused outreach wins.
                Foothold learns your real work, hunts the right early-stage teams,
                and drafts the intro. You wake up to conversations, not rejections.
              </p>

              <div
                className="animate-up mt-7 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "0.24s" }}
              >
                <Link href="/app" className="l-btn l-btn-primary">
                  start the conversation →
                </Link>
                <a href="#how" className="l-btn l-btn-ghost">
                  see how it works
                </a>
              </div>
              <p
                className="animate-up mt-4 text-[13px]"
                style={{ animationDelay: "0.3s", color: "var(--faint)" }}
              >
                texts you like a sharp friend who happens to be great at this.
              </p>
            </div>

            {/* Chat mock */}
            <div
              className="animate-up l-card mx-auto w-full max-w-sm p-3"
              style={{ animationDelay: "0.18s" }}
            >
              <div
                className="mb-2 flex items-center gap-2 border-b px-2 pb-3 pt-1"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  <Mark size={16} />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">foothold</div>
                  <div className="text-[11px]" style={{ color: "var(--faint)" }}>
                    iMessage · WhatsApp · web
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-1 pb-1">
                {CHAT.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`lb ${m.role === "out" ? "lb-out" : "lb-in"}`}
                      style={{ animationDelay: `${0.5 + i * 0.55}s` }}
                    >
                      {m.text}
                      {m.fit && (
                        <span
                          className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold align-middle"
                          style={{
                            background: "var(--accent-ink)",
                            color: "var(--accent)",
                          }}
                        >
                          {m.fit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* ---- Sources strip ---- */}
        <section className="mx-auto max-w-5xl px-6 py-10">
          <p
            className="reveal text-center text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--faint)" }}
          >
            where it watches for your next opening
          </p>
          <div className="reveal mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px] font-medium" style={{ color: "var(--muted)" }}>
            <span>Y Combinator</span>
            <span>Product Hunt</span>
            <span>TechCrunch</span>
            <span>Crunchbase</span>
            <span style={{ color: "var(--faint)" }}>+ the rest of the internet</span>
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="reveal text-center text-[30px] font-semibold tracking-tight sm:text-[36px]">
            Three steps. The opposite of mass-apply.
          </h2>
          <p
            className="reveal mx-auto mt-3 max-w-xl text-center text-[16px]"
            style={{ color: "var(--muted)" }}
          >
            A few researched, worth-your-tap outreaches — each one written for a
            founder who&apos;s actually a fit.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "It learns you",
                d: "A quick chat gives it your background, taste, and what you actually want. Then it reads your real work — live sites, repos, projects — not just a résumé.",
              },
              {
                n: "02",
                t: "It sources & scores",
                d: "Every search combs the web for early-stage teams that fit you, then ranks them by genuine fit — a 0–100 score with a one-line reason, not keyword spam.",
              },
              {
                n: "03",
                t: "You approve, it drafts",
                d: "A personalized founder email for each match, in your voice, referencing something real. Nothing goes out until you say SEND.",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className="reveal l-card p-6"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <div
                  className="serif text-[15px] font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {s.n}
                </div>
                <h3 className="mt-3 text-[19px] font-semibold">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Pipeline peek ---- */}
        <section id="pipeline" className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="reveal text-[30px] font-semibold tracking-tight sm:text-[36px]">
                Every match, draft, and status —{" "}
                <span className="serif italic" style={{ color: "var(--accent)" }}>
                  in the open.
                </span>
              </h2>
              <p className="reveal mt-4 text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Foothold is a copilot you chat with in plain english. For everything
                it does on your behalf, there&apos;s a live pipeline: who it found,
                why, the exact email it wrote, and whether you approved it. No black
                box, no messages sent in your name that you didn&apos;t see first.
              </p>
              <div className="reveal mt-6">
                <Link href="/app" className="l-btn l-btn-primary">
                  open the pipeline →
                </Link>
              </div>
            </div>

            {/* Match card mock */}
            <div className="reveal l-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[17px] font-semibold">Fastshot</div>
                  <div className="text-[13px]" style={{ color: "var(--faint)" }}>
                    founding design engineer
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  strong fit · 82
                </span>
              </div>
              <div className="mt-2 text-[12px]" style={{ color: "var(--faint)" }}>
                YC · “lovable for mobile apps” · 3-person team, no designer
              </div>
              <p className="mt-3 text-[14px]" style={{ color: "var(--muted)" }}>
                Their whole product is prompt-to-app; your made. table is
                prompt-to-branded-site with the same generation architecture. That&apos;s
                the hook.
              </p>
              <div
                className="mt-4 rounded-xl p-3 text-[13px]"
                style={{ background: "color-mix(in srgb, var(--ink) 5%, transparent)" }}
              >
                <div style={{ color: "var(--faint)" }}>
                  To: Dmitry Fatkhi ·{" "}
                  <span style={{ color: "var(--muted)" }}>
                    founding design engineer, i already build what you&apos;re building
                  </span>
                </div>
                <div className="mt-2" style={{ color: "var(--muted)" }}>
                  “You generate mobile apps from a prompt. I built the same shape of
                  thing…”
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[12px] font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  SEND
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[12px] font-semibold"
                  style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                >
                  EDIT
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[12px] font-semibold"
                  style={{ border: "1px solid var(--line)", color: "var(--faint)" }}
                >
                  SKIP
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Closing CTA ---- */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="reveal l-card px-8 py-14 text-center">
            <h2 className="mx-auto max-w-2xl text-[32px] font-semibold leading-tight tracking-tight sm:text-[42px]">
              Your unfair advantage.
            </h2>
            <p
              className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              Text once. Foothold handles the search, the outreach, and the
              follow-ups — you focus on the work only you can do.
            </p>
            <div className="mt-7">
              <Link href="/app" className="l-btn l-btn-primary">
                start the conversation →
              </Link>
            </div>
          </div>
        </section>

        {/* ---- Footer ---- */}
        <footer
          className="mx-auto max-w-5xl px-6 py-10"
          style={{ borderTop: "1px solid var(--line-soft)", color: "var(--faint)" }}
        >
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <Mark size={18} />
              <span className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                foothold
              </span>
            </div>
            <div className="text-[13px]">
              built for one person · powered by Claude
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ThemeGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9c0-.46-.03-.92-.1-1.36A5.5 5.5 0 0 1 12.4 3.1 8.9 8.9 0 0 0 12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
