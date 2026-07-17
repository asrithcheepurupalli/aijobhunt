import { NextRequest, NextResponse } from "next/server";
import { runTurn } from "@/lib/agent";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
// Agentic turns (sourcing + web search) can run for a while.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }

  try {
    const messages = await runTurn(text);
    const state = await readState();
    return NextResponse.json({ messages, state });
  } catch (err) {
    const message = (err as Error).message || "something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
