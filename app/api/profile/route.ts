import { NextRequest, NextResponse } from "next/server";
import { readState, setProfileFields } from "@/lib/store";
import type { ProfilePatch } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET current profile.
export async function GET() {
  const state = await readState();
  return NextResponse.json({ profile: state.profile });
}

// The fields the Profile page is allowed to edit. Research-note fields
// (confidence, open questions) are read-only and only set by re-running research.
const EDITABLE: (keyof ProfilePatch)[] = [
  "name",
  "targetRole",
  "positioning",
  "proudestOf",
  "priorities",
  "links",
  "location",
  "remoteOnly",
  "offLimits",
  "dealbreakers",
  "targetCriteria",
  "emailStyle",
  "summary",
  "strongestSignals",
  "dossier",
];

// PUT overwrites the editable fields with exactly what's sent.
export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key];
  }

  const profile = await setProfileFields(patch as ProfilePatch);
  return NextResponse.json({ profile });
}
