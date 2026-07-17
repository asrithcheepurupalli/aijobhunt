import { NextRequest, NextResponse } from "next/server";
import { updateMatch } from "@/lib/store";
import type { MatchStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED: MatchStatus[] = ["new", "approved", "sent", "skipped"];

// Dashboard actions: approve / skip a match without going through chat.
export async function POST(req: NextRequest) {
  let id = "";
  let status: MatchStatus = "new";
  try {
    const body = (await req.json()) as { id?: string; status?: MatchStatus };
    id = body.id ?? "";
    status = (body.status ?? "new") as MatchStatus;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!id || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const updated = await updateMatch(id, { status });
  if (!updated) {
    return NextResponse.json({ error: "match not found" }, { status: 404 });
  }
  return NextResponse.json({ match: updated });
}
