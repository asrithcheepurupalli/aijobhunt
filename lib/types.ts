// Core domain types for the hiring agent.

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
}

// What the agent has learned about you. Everything is optional so the profile
// fills in gradually over the onboarding chat, exactly like the real thing.
// It is also fully editable on the Profile page — your edits stick until you
// re-run research.
export interface Profile {
  // ---- what you've told us (the basics) ----
  name?: string;
  // e.g. "Founding Design Engineer", "Marketing / GTM", "Product Manager".
  targetRole?: string;
  // The one-line positioning the agent lands on, e.g.
  // "founding design engineer — first design hire who ships the frontend".
  positioning?: string;
  // Proudest thing you've built or shipped.
  proudestOf?: string;
  headline?: string;
  // Ranked, in the person's own words — what matters to you.
  priorities?: string[];
  links?: string[];

  // ---- preferences (what Foothold filters for + how it writes) ----
  location?: string;
  remoteOnly?: boolean;
  availability?: string;
  // Companies to never contact.
  offLimits?: string[];
  dealbreakers?: string[];
  // What the agent is hunting for on your behalf (stage, team size, comp, etc.).
  targetCriteria?: string;
  // Tone, openers, banned phrases, sign-off — how your emails should read.
  emailStyle?: string;
  // Free-form notes the agent decided were worth saving "verbatim".
  notes?: string[];

  // ---- what Foothold uses to pitch you (generated from links, editable) ----
  summary?: string;
  // Standout proof points.
  strongestSignals?: string[];
  // The complete profile used when drafting founder emails.
  dossier?: string;

  // ---- research notes (generated from links; read-only in the UI) ----
  research?: string;
  researchConfidence?: "high" | "medium" | "low";
  researchOpenQuestions?: string[];
  researchUpdatedAt?: number;

  updatedAt?: number;
}

// The subset of profile fields editable from the Profile page.
export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "name"
    | "targetRole"
    | "positioning"
    | "proudestOf"
    | "priorities"
    | "links"
    | "location"
    | "remoteOnly"
    | "offLimits"
    | "dealbreakers"
    | "targetCriteria"
    | "emailStyle"
    | "summary"
    | "strongestSignals"
    | "dossier"
  >
>;

export type MatchStatus = "new" | "approved" | "sent" | "skipped";
export type FitLabel = "strong fit" | "good fit" | "worth a look";

// A sourced company + the founder-outreach draft written for it.
export interface Match {
  id: string;
  company: string;
  companyUrl?: string;
  roleTitle: string;
  stage?: string; // e.g. "YC W26, $4.3M seed"
  fitScore: number; // 0-100
  fitLabel: FitLabel;
  whyFit: string; // one-line reason it was picked
  founderName?: string;
  founderEmail?: string;
  draftSubject: string;
  draftBody: string;
  status: MatchStatus;
  sourcedAt: number;
  updatedAt: number;
}

export interface AppState {
  profile: Profile;
  messages: ChatMessage[];
  matches: Match[];
}
