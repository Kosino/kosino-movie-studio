import { NextRequest, NextResponse } from "next/server";
import { parseShotListLocally, parseShotListWithLlm } from "@/lib/xai";
import { requireCaller } from "@/lib/require-auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  const identity = await requireCaller(req);
  if (identity instanceof Response) return identity;

  try {
    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "Prázdný shot list" },
        { status: 400, headers: noStore }
      );
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
        { status: 400, headers: noStore }
      );
    }

    return NextResponse.json({ shots }, { headers: noStore });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse selhal";
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
