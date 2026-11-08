import { NextRequest, NextResponse } from "next/server";
import { parseShotListLocally, parseShotListWithLlm } from "@/lib/xai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Prázdný shot list" }, { status: 400 });
    }

    let shots: string[] | null = null;
    try {
      shots = await parseShotListWithLlm(text);
    } catch {
      shots = null;
    }

    if (!shots || shots.length === 0) {
      shots = parseShotListLocally(text);
    }

    if (!shots.length) {
      return NextResponse.json(
        { error: "Nepodařilo se rozpoznat žádné záběry" },
        { status: 400 }
      );
    }

    return NextResponse.json({ shots });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse selhal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
