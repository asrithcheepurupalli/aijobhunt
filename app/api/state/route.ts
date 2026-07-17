import { NextResponse } from "next/server";
import { ensureGreeting } from "@/lib/agent";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Returns the full app state (profile, chat history, matches). Seeds the
// opening greeting on first load.
export async function GET() {
  try {
    await ensureGreeting();
  } catch {
    // Greeting seeding shouldn't hard-fail the state read.
  }
  const state = await readState();
  return NextResponse.json(state);
}
