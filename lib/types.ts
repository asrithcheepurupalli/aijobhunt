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
export interface Profile {
  name?: string;
  // The one-line positioning the agent lands on, e.g.
  // "founding design engineer — first design hire who ships the frontend".
  positioning?: string;
  headline?: string;
  location?: string;
  availability?: string;
  links?: string[];
  // Ranked, in the person's own words.
  priorities?: string[];
  dealbreakers?: string[];
  // Free-form notes the agent decided were worth saving "verbatim".
  notes?: string[];
  // What the agent is hunting for on your behalf (stage, team size, etc.).
  targetCriteria?: string;
  // Raw research findings after the agent crawled your links.
  research?: string;
  updatedAt?: number;
}

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
