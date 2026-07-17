import type Anthropic from "@anthropic-ai/sdk";
import { getClient, MODEL } from "./anthropic";
import { redraftOutreach, sourceMatches } from "./sourcing";
import {
  addMessage,
  findMatch,
  mergeProfile,
  readState,
  setProfileFields,
  updateMatch,
  upsertMatches,
} from "./store";
import type { AppState, ChatMessage, Profile } from "./types";

// The persona. Voice and flow are lifted directly from how the real agent runs:
// warm, lowercase-friendly, concise, one clear next step at a time. It saves
// good positioning verbatim, researches your links before pitching, scores fit
// honestly, and never sends anything without you approving it first.
const SYSTEM = `you are foothold — the user's personal startup-hiring agent, a text-native copilot that helps them land a role at an early-stage startup. you learn their background, find high-fit early-stage companies, and draft founder outreach they approve before anything goes out. this is a personal tool the user runs on their own api key; there is no billing, pricing, or gmail-activation flow — never ask them to pay or "set up billing".

VOICE
- warm, direct, lowercase-friendly. short messages. one clear ask at a time. no corporate filler, no emoji spam.
- you're a strategist who also does the grunt work. confident but never fabricating.
- when someone gives you sharp positioning, tell them you're saving it verbatim, and use their exact words later.

THE FLOW (don't rush it; move one step at a time)
1. first contact: greet, say briefly what you do, ask their name.
2. ask for something crawlable — linkedin, github, portfolio, resume link. a hosted link beats a pdf you can't open. if they only send a pdf, ask for a link.
3. once you have links, call research_links to actually read their work. then come back with "what jumps out" and "what's still fuzzy". be specific about what you saw.
4. ask for ranked priorities (learning, equity, mission, comp, team, etc.) and any dealbreakers/preferences (industries to skip, comp floor, team size, remote vs relocate).
5. ask ONE sharp rubber-stamp question that changes which founders you look for (e.g. "first design hire who ships frontend, or first frontend person who owns the look?"). save the answer verbatim.
6. synthesize their positioning in one line and reflect it back. lay out the target: stage, team size, founder type, what to avoid.
7. call save_profile as you learn things so nothing is lost.
8. when the profile is solid, call find_matches to source real companies. present matches ONE AT A TIME (see MATCH FORMAT).

SAVING
- call save_profile whenever you learn name, positioning, priorities, dealbreakers, availability, links, target criteria, or a line worth keeping. merge, don't overwrite.
- after research_links, the findings are saved automatically; weave them into your reply.

MATCH FORMAT (exactly how to present each sourced company)
present each match as its own message:

new match — <Company> (<fit label>). <one line on the company + why it fits them>. want me to send it, or change anything?

To: <Founder Name> (<founder email>)
Subject: <subject>

<full email body>

reply SEND, EDIT, or SKIP — or just tell me what to change

APPROVAL PROTOCOL (this is a hard rule)
- nothing is ever sent without the user approving it first — first emails AND follow-ups.
- your drafts are a starting point. if they say EDIT or describe changes, call update_outreach with their instructions, then show the revised email and ask "send it?".
- if they say SEND, call set_match_status with status "approved" (this marks it ready to send from their dashboard — you never silently deliver). confirm briefly, e.g. "approved — it's ready to send from your dashboard ✓".
- if they say SKIP, call set_match_status with status "skipped".
- never fabricate metrics or numbers the user didn't give you. if a founder email isn't known, say so rather than inventing one.

be genuinely helpful, move the process forward, and keep it feeling like a text conversation with a sharp friend who happens to be great at this.`;

// ---- tools ----------------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: "save_profile",
    description:
      "Save or merge what you've learned about the user. Call whenever you learn something worth keeping. List fields append; scalar fields overwrite.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        targetRole: {
          type: "string",
          description: "The role they're going for, e.g. 'founding design engineer'.",
        },
        positioning: {
          type: "string",
          description: "One-line positioning, ideally in the user's own words.",
        },
        proudestOf: {
          type: "string",
          description: "The proudest thing they've built or shipped.",
        },
        headline: { type: "string" },
        location: { type: "string" },
        remoteOnly: {
          type: "boolean",
          description: "True if they only want remote right now.",
        },
        availability: { type: "string" },
        links: { type: "array", items: { type: "string" } },
        priorities: {
          type: "array",
          items: { type: "string" },
          description: "Ranked priorities, in their words.",
        },
        dealbreakers: { type: "array", items: { type: "string" } },
        offLimits: {
          type: "array",
          items: { type: "string" },
          description: "Companies to never contact.",
        },
        emailStyle: {
          type: "string",
          description: "How their outreach should read: tone, openers, banned phrases, sign-off.",
        },
        notes: {
          type: "array",
          items: { type: "string" },
          description: "Lines worth saving verbatim.",
        },
        targetCriteria: {
          type: "string",
          description: "What you're hunting for on their behalf (stage, team size, founder type, exclusions).",
        },
      },
    },
  },
  {
    name: "research_links",
    description:
      "Crawl and read the user's links (portfolio, github, linkedin, project sites) to understand their real work before pitching. Returns findings, which are also saved to their profile.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to research.",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "find_matches",
    description:
      "Source real early-stage startups that fit the user, score them, and draft founder outreach for each. Only call once the profile has enough signal (positioning, priorities, dealbreakers). Returns the matches; present them one at a time.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        count: {
          type: "integer",
          description: "How many matches to source (default 3).",
        },
        direction: {
          type: "string",
          description: "Optional extra search direction for this batch.",
        },
      },
    },
  },
  {
    name: "update_outreach",
    description:
      "Revise a match's outreach email based on the user's requested changes. Returns the revised subject and body.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        match: {
          type: "string",
          description: "The company name or match id to edit.",
        },
        instructions: {
          type: "string",
          description: "What the user wants changed.",
        },
      },
      required: ["match", "instructions"],
    },
  },
  {
    name: "set_match_status",
    description:
      "Update a match's status. 'approved' = user tapped SEND, mark it ready to send from their dashboard (never actually deliver silently). 'skipped' = user passed.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        match: { type: "string", description: "Company name or match id." },
        status: { type: "string", enum: ["approved", "skipped"] },
      },
      required: ["match", "status"],
    },
  },
];

// ---- research helper -------------------------------------------------------

export interface ResearchResult {
  summary: string;
  strongestSignals: string[];
  dossier: string;
  findings: string;
  confidence: "high" | "medium" | "low";
  openQuestions: string[];
}

const SUBMIT_RESEARCH: Anthropic.Tool = {
  name: "submit_research",
  description:
    "Submit the structured research profile built from reading the person's links. Call once, after reading their sites.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "2-4 sentence summary of who they are and what they build.",
      },
      strongestSignals: {
        type: "array",
        items: { type: "string" },
        description: "Standout proof points — concrete, specific.",
      },
      dossier: {
        type: "string",
        description:
          "The complete profile used when drafting founder emails: projects, clients, stack, what they own end-to-end, taste signals. Detailed and factual — no fabricated metrics.",
      },
      findings: {
        type: "string",
        description: "6-10 tight bullet points of what you saw across their links.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "How complete the picture is given what you could crawl.",
      },
      openQuestions: {
        type: "array",
        items: { type: "string" },
        description: "Specific things you couldn't confirm and would want the person to fill in.",
      },
    },
    required: ["summary", "strongestSignals", "dossier", "findings", "confidence"],
  },
};

async function researchLinks(
  urls: string[],
  profile: Profile,
): Promise<ResearchResult> {
  const client = getClient();
  const system = `You research a person's work from their links so a hiring agent can position them and write their cold emails. Read the sites (and search for context), then build a structured profile: a summary, their strongest signals, a full dossier for drafting emails, tight findings, a confidence level, and open questions you couldn't resolve. Be specific and concrete. Never fabricate metrics or facts you can't see. When done, call submit_research once.`;
  const userPrompt = `Person: ${profile.name ?? "(unknown)"}\nLinks to research:\n${urls.join("\n")}\n\nRead these thoroughly, then submit_research.`;

  const serverTools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 },
  ];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let i = 0; i < 12; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      tools: [SUBMIT_RESEARCH, ...(serverTools as unknown as Anthropic.Tool[])],
      messages,
    });
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const submit = toolUses.find((t) => t.name === "submit_research");
    if (submit) {
      const input = submit.input as Partial<ResearchResult>;
      return {
        summary: input.summary ?? "",
        strongestSignals: input.strongestSignals ?? [],
        dossier: input.dossier ?? "",
        findings: input.findings ?? "",
        confidence: input.confidence ?? "medium",
        openQuestions: input.openQuestions ?? [],
      };
    }
    if (toolUses.length === 0) {
      // No tool call, not paused — nudge once to submit.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: "Please call submit_research now with what you found.",
      });
      continue;
    }
    // It made server-tool calls (handled server-side); continue the loop.
    messages.push({ role: "assistant", content: response.content });
  }
  return {
    summary: "",
    strongestSignals: [],
    dossier: "",
    findings: "(research came back thin — couldn't pull much structured detail.)",
    confidence: "low",
    openQuestions: [],
  };
}

function saveResearch(r: ResearchResult): Promise<Profile> {
  return setProfileFields({
    summary: r.summary || undefined,
    strongestSignals: r.strongestSignals.length ? r.strongestSignals : undefined,
    dossier: r.dossier || undefined,
    research: r.findings,
    researchConfidence: r.confidence,
    researchOpenQuestions: r.openQuestions,
    researchUpdatedAt: Date.now(),
  });
}

// Re-run research from the profile's links (or a provided set) and overwrite the
// research-generated fields. Powers the Profile page's "re-run research" button.
export async function rerunResearch(urls?: string[]): Promise<Profile> {
  const state = await readState();
  const links = (urls && urls.length ? urls : state.profile.links) ?? [];
  if (links.length === 0) {
    throw new Error("no links on your profile yet — add some first.");
  }
  const r = await researchLinks(links, state.profile);
  return saveResearch(r);
}

// ---- tool dispatch ---------------------------------------------------------

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  const state = await readState();

  switch (name) {
    case "save_profile": {
      await mergeProfile(input as Partial<Profile>);
      return "saved.";
    }
    case "research_links": {
      const urls = (input.urls as string[]) ?? [];
      const r = await researchLinks(urls, state.profile);
      // Overwrite the research-generated fields (they're regenerated each run).
      await saveResearch(r);
      // Persist any links the agent researched so the profile has them.
      if (urls.length) await mergeProfile({ links: urls });
      return `research complete (confidence: ${r.confidence}).\n\nsummary: ${r.summary}\n\nstrongest signals:\n${r.strongestSignals.map((s) => `- ${s}`).join("\n")}\n\nfindings:\n${r.findings}${r.openQuestions.length ? `\n\nopen questions:\n${r.openQuestions.map((q) => `- ${q}`).join("\n")}` : ""}`;
    }
    case "find_matches": {
      const count = Math.max(1, Math.min(10, Number(input.count) || 3));
      const direction = input.direction as string | undefined;
      const matches = await sourceMatches(state.profile, direction, count);
      if (matches.length === 0) {
        return "sourcing came back empty this round — no strong matches surfaced. can retry.";
      }
      await upsertMatches(matches);
      // Hand the structured matches back so the agent can present them.
      const summary = matches
        .map(
          (m) =>
            `- id=${m.id} | ${m.company} (${m.fitLabel}, ${m.fitScore}) | role: ${m.roleTitle} | stage: ${m.stage ?? "n/a"} | founder: ${m.founderName ?? "unknown"} <${m.founderEmail ?? "no email found"}> | why: ${m.whyFit}\n  Subject: ${m.draftSubject}\n  Body: ${m.draftBody}`,
        )
        .join("\n\n");
      return `sourced ${matches.length} match(es). present them one at a time in the MATCH FORMAT:\n\n${summary}`;
    }
    case "update_outreach": {
      const ref = String(input.match ?? "");
      const match = findMatch(state, ref);
      if (!match) return `couldn't find a match called "${ref}".`;
      const { subject, body } = await redraftOutreach(
        state.profile,
        match,
        String(input.instructions ?? ""),
      );
      await updateMatch(match.id, { draftSubject: subject, draftBody: body });
      return `revised draft for ${match.company}:\nSubject: ${subject}\n\n${body}`;
    }
    case "set_match_status": {
      const ref = String(input.match ?? "");
      const status = String(input.status ?? "") as "approved" | "skipped";
      const match = findMatch(state, ref);
      if (!match) return `couldn't find a match called "${ref}".`;
      await updateMatch(match.id, { status });
      return status === "approved"
        ? `${match.company} marked approved — ready to send from the dashboard.`
        : `${match.company} skipped.`;
    }
    default:
      return `unknown tool: ${name}`;
  }
}

// ---- turn loop -------------------------------------------------------------

function stateContext(state: AppState): string {
  const p = state.profile;
  const known = Object.entries({
    name: p.name,
    positioning: p.positioning,
    location: p.location,
    availability: p.availability,
    links: p.links?.join(", "),
    priorities: p.priorities?.join(" | "),
    dealbreakers: p.dealbreakers?.join(" | "),
    targetCriteria: p.targetCriteria,
    research: p.research ? "(collected)" : undefined,
  })
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const matchLines = state.matches
    .map(
      (m) =>
        `  - id=${m.id} ${m.company} [${m.status}] (${m.fitLabel} ${m.fitScore})`,
    )
    .join("\n");

  return `CURRENT STATE (for your reference; don't re-source what's already here)
profile:
${known || "  (nothing saved yet)"}
matches:
${matchLines || "  (none sourced yet)"}`;
}

function toApiMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.map((m) => ({ role: m.role, content: m.text }));
}

// Run one user turn: persist the user message, run the agentic loop (tools +
// possible multiple text messages), persist and return the assistant messages.
export async function runTurn(userText: string): Promise<ChatMessage[]> {
  const client = getClient();
  await addMessage("user", userText);

  const stateBefore = await readState();
  const messages: Anthropic.MessageParam[] = toApiMessages(stateBefore.messages);

  const assistantOut: ChatMessage[] = [];

  for (let i = 0; i < 10; i++) {
    const current = await readState();
    const system = `${SYSTEM}\n\n${stateContext(current)}`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      tools: TOOLS,
      messages,
    });

    // Persist any text the assistant produced this turn as chat messages.
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    for (const tb of textBlocks) {
      const trimmed = tb.text.trim();
      if (trimmed) {
        const saved = await addMessage("assistant", trimmed);
        assistantOut.push(saved);
      }
    }

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      break; // end_turn
    }

    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      let out: string;
      try {
        out = await executeTool(tu.name, tu.input as Record<string, unknown>);
      } catch (err) {
        out = `tool error: ${(err as Error).message}`;
      }
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: out,
      });
    }
    messages.push({ role: "user", content: results });
  }

  // Safety net: if the loop produced no text at all, add a gentle nudge.
  if (assistantOut.length === 0) {
    const saved = await addMessage(
      "assistant",
      "hmm, i hit a snag on my end — mind trying that again?",
    );
    assistantOut.push(saved);
  }

  return assistantOut;
}

// The very first assistant message, shown before the user says anything.
export async function ensureGreeting(): Promise<void> {
  const state = await readState();
  if (state.messages.length > 0) return;
  await addMessage(
    "assistant",
    "hey! i'm foothold — i help people land roles at early-stage startups by figuring out where you fit best and surfacing the right opportunities. think of me as your personal startup job strategist (who also handles the grunt work).\n\nwhat's your name?",
  );
}
