import type Anthropic from "@anthropic-ai/sdk";
import { getClient, MODEL } from "./anthropic";
import { newId } from "./store";
import type { FitLabel, Match, Profile } from "./types";

// The sourcing engine. Given a profile and search criteria, it combs the web
// for real early-stage startups that fit, scores each one, and drafts a
// founder-outreach email per match — the same shape as Backdoor's daily batch.
//
// It runs as its own agentic call (web search + a submit tool) so the main
// chat agent can invoke it as a single tool and then narrate the results.

interface RawMatch {
  company: string;
  companyUrl?: string;
  roleTitle: string;
  stage?: string;
  fitScore: number;
  whyFit: string;
  founderName?: string;
  founderEmail?: string;
  draftSubject: string;
  draftBody: string;
}

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_matches",
  description:
    "Submit the final list of researched startup matches with a drafted founder-outreach email for each. Call this exactly once, after you have researched real companies.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      matches: {
        type: "array",
        description: "The researched startup matches, best fit first.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            company: { type: "string", description: "Company name." },
            companyUrl: { type: "string", description: "Company website or a source URL." },
            roleTitle: {
              type: "string",
              description: "The role you'd pitch for, e.g. 'founding design engineer'.",
            },
            stage: {
              type: "string",
              description: "Funding/stage signal, e.g. 'YC W26, $4.3M seed' or 'pre-seed, 4 people'.",
            },
            fitScore: {
              type: "integer",
              description: "0-100 fit score for this person against this company.",
            },
            whyFit: {
              type: "string",
              description: "One tight sentence on why this is a match for them specifically.",
            },
            founderName: { type: "string", description: "Best-known founder/hiring name if findable." },
            founderEmail: {
              type: "string",
              description: "Founder contact email if findable (e.g. founders@company.com). Leave blank if unknown — do not invent a personal address.",
            },
            draftSubject: { type: "string", description: "Email subject line." },
            draftBody: {
              type: "string",
              description:
                "The full outreach email body in the person's voice: specific, references something real about the company, ties their work to what the company is building, ends with a soft 15-min-call ask and their name + links. No fabricated metrics.",
            },
          },
          required: [
            "company",
            "roleTitle",
            "fitScore",
            "whyFit",
            "draftSubject",
            "draftBody",
          ],
        },
      },
    },
    required: ["matches"],
  },
};

function fitLabel(score: number): FitLabel {
  if (score >= 78) return "strong fit";
  if (score >= 65) return "good fit";
  return "worth a look";
}

function profileBlock(profile: Profile): string {
  const lines: string[] = [];
  if (profile.name) lines.push(`Name: ${profile.name}`);
  if (profile.positioning) lines.push(`Positioning: ${profile.positioning}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.availability) lines.push(`Availability: ${profile.availability}`);
  if (profile.links?.length) lines.push(`Links: ${profile.links.join(", ")}`);
  if (profile.priorities?.length)
    lines.push(`Priorities (ranked): ${profile.priorities.join(" | ")}`);
  if (profile.dealbreakers?.length)
    lines.push(`Dealbreakers: ${profile.dealbreakers.join(" | ")}`);
  if (profile.targetCriteria) lines.push(`Target criteria: ${profile.targetCriteria}`);
  if (profile.notes?.length) lines.push(`Notes: ${profile.notes.join(" | ")}`);
  if (profile.research) lines.push(`Research findings:\n${profile.research}`);
  return lines.join("\n");
}

const SOURCING_SYSTEM = `You are the sourcing engine behind a startup-hiring agent. Your job: find REAL, currently-early-stage startups that fit this specific person, then draft a founder-outreach email for each.

Rules:
- Use web search to find ACTUAL companies (YC batches, Product Hunt launches, recent funding on TechCrunch/Crunchbase, "who's hiring" threads, founder posts). Prefer companies that are genuinely early (pre-seed to Series A, small team, founder still hands-on).
- Respect the person's dealbreakers strictly. Never surface a company in an excluded category.
- Score fit honestly (0-100). Reserve 78+ for genuinely strong matches.
- Draft each email in the PERSON'S voice, lowercase-friendly, specific to that company. Reference something concrete and real about the company. Tie the person's actual shipped work to what the company is building. End with a soft "worth a 15-min call?" ask and their name + links.
- NEVER fabricate metrics, numbers, or claims the person didn't make. If you don't have a real founder email, leave it blank rather than inventing a personal address.
- When done researching, call submit_matches exactly once with all matches.`;

export async function sourceMatches(
  profile: Profile,
  criteria: string | undefined,
  count: number,
): Promise<Match[]> {
  const client = getClient();

  const userPrompt = `Here is the person you're sourcing for:

${profileBlock(profile)}

${criteria ? `Extra search direction for this batch: ${criteria}\n\n` : ""}Find ${count} strong, real matches. Research them on the web first, then call submit_matches.`;

  const tools: Anthropic.Tool[] = [SUBMIT_TOOL];
  // Server-side web search tool (dynamic filtering variant, supported on Opus 4.8).
  const serverTools = [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  let submitted: RawMatch[] | null = null;

  // Manual agentic loop: let the model search, then submit. Cap iterations so a
  // runaway or repeated pause_turn can't loop forever.
  for (let i = 0; i < 12 && submitted === null; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SOURCING_SYSTEM,
      // Server tools and custom tools coexist in the same tools array.
      tools: [...tools, ...(serverTools as unknown as Anthropic.Tool[])],
      messages,
    });

    // Server-tool turn hit its internal limit — resend to continue.
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUses.length === 0) {
      // No tool call and not paused — nudge it once to submit, then stop.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: "Please call submit_matches now with the matches you found.",
      });
      continue;
    }

    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name === "submit_matches") {
        const input = tu.input as { matches?: RawMatch[] };
        submitted = input.matches ?? [];
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "received",
        });
      } else {
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "unknown tool",
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: results });
  }

  const raw = submitted ?? [];
  const now = Date.now();
  return raw.map((r) => {
    const score = Math.max(0, Math.min(100, Math.round(r.fitScore)));
    const m: Match = {
      id: newId("match"),
      company: r.company,
      companyUrl: r.companyUrl,
      roleTitle: r.roleTitle,
      stage: r.stage,
      fitScore: score,
      fitLabel: fitLabel(score),
      whyFit: r.whyFit,
      founderName: r.founderName,
      founderEmail: r.founderEmail,
      draftSubject: r.draftSubject,
      draftBody: r.draftBody,
      status: "new",
      sourcedAt: now,
      updatedAt: now,
    };
    return m;
  });
}

// Re-draft (or edit) a single match's outreach email given free-form
// instructions from the person. Runs as a small, focused call.
export async function redraftOutreach(
  profile: Profile,
  match: Match,
  instructions: string,
): Promise<{ subject: string; body: string }> {
  const client = getClient();

  const system = `You rewrite founder-outreach emails to sound like the person sending them, not like an automated tool. Keep it specific, honest (never fabricate metrics), and in a warm lowercase-friendly voice. Return ONLY the revised email via the submit_draft tool.`;

  const submitDraft: Anthropic.Tool = {
    name: "submit_draft",
    description: "Submit the revised email.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["subject", "body"],
    },
  };

  const userPrompt = `Person:
${profileBlock(profile)}

Company: ${match.company} (${match.stage ?? "early stage"})
Role: ${match.roleTitle}
${match.founderName ? `Founder: ${match.founderName}` : ""}

Current draft:
Subject: ${match.draftSubject}

${match.draftBody}

Requested changes:
${instructions}

Apply the changes and submit the revised email.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system,
    tools: [submitDraft],
    tool_choice: { type: "tool", name: "submit_draft" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const tu = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (tu) {
    const input = tu.input as { subject?: string; body?: string };
    return {
      subject: input.subject ?? match.draftSubject,
      body: input.body ?? match.draftBody,
    };
  }
  return { subject: match.draftSubject, body: match.draftBody };
}
