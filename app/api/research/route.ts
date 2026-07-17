import { NextRequest, NextResponse } from "next/server";
import { rerunResearch } from "@/lib/agent";

export const dynamic = "force-dynamic";
// Reading multiple sites with web fetch can take a while.
export const maxDuration = 300;

// Re-run research from the profile's links (or a provided set) and replace the
// research-generated fields.
export async function POST(req: NextRequest) {
  let urls: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { urls?: string[] };
    urls = Array.isArray(body.urls) ? body.urls : undefined;
  } catch {
    urls = undefined;
  }

  try {
    const profile = await rerunResearch(urls);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "research failed" },
      { status: 500 },
    );
  }
}
