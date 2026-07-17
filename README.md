# Foothold

Your personal **startup-hiring agent** — text-native, built for you.

You chat with it like you'd text a friend. It learns your background, reads your
actual work, sources **real** early-stage startups that fit you, scores each one,
and drafts founder outreach. **Nothing is ever sent without you approving it first.**

It's a personal tool that runs on **your own Anthropic API key** — no pricing, no
billing, no subscription. You just pay for API credits.

## The flow

1. **Onboarding** — it greets you, asks your name, then asks for crawlable links
   (portfolio, GitHub, LinkedIn, project sites).
2. **Research** — it actually reads your links (web search + fetch) and comes back
   with what stands out and what's still fuzzy.
3. **Positioning** — it asks for your ranked priorities and dealbreakers, one sharp
   rubber-stamp question, then lands on a one-line positioning and a target profile.
4. **Sourcing** — it combs the web for real early-stage companies that match, scores
   fit (0–100), and drafts a personalized founder email for each.
5. **Approval** — matches come through one at a time. Reply **SEND**, **EDIT**, or
   **SKIP** — or just say what to change. Approved drafts land in your dashboard,
   ready to send from your own mail client. It never emails on your behalf silently.

The right-hand **pipeline** shows every match, draft, and status for full traceability.

## Routes

- `/` — the landing page (theme-aware, responsive).
- `/app` — the agent: iMessage-style chat + live pipeline dashboard.

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Claude** (`@anthropic-ai/sdk`) — `claude-opus-4-8` by default; the agent uses
  server-side web search + fetch for real sourcing and research
- A tiny JSON file store (`.data/db.json`) — no database, no native deps. Swap
  `lib/store.ts` for Postgres/Supabase when you outgrow it.

## Design notes

- **Draft-only email.** Real sourcing, but outreach is drafted for you to review and
  send yourself (via "open in mail" / copy). Wiring a real send path (Gmail/SMTP)
  is a deliberate next step, not a default — this keeps you in control.
- **Voice.** The agent's persona (warm, lowercase, concise, saves your positioning
  verbatim) lives in `lib/agent.ts`. Tune it there.
- **Tools.** `save_profile`, `research_links`, `find_matches`, `update_outreach`,
  `set_match_status` — see `lib/agent.ts`. Sourcing + redrafting live in
  `lib/sourcing.ts`.

## Next steps (optional)

- Real send + reply tracking + automated multi-step follow-ups.
- A daily "digest" cron that sources a fresh batch each morning.
- WhatsApp/SMS bridge (Twilio) so it's truly text-native.
