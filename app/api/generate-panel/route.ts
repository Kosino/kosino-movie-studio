import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { generateImage } from "@/lib/xai";
import { ensureDirs, GENERATED_DIR, publicUrl } from "@/lib/paths";
import { resolvePublicAsset } from "@/lib/safe-path";
import { requireCaller } from "@/lib/require-auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  const identity = await requireCaller(req);
  if (identity instanceof Response) return identity;

  try {
    ensureDirs();
    const body = await req.json();
    const scenePrompt = String(body.scenePrompt || "").trim();
    const cameraType = String(body.cameraType || "Wide");
    const locationHint = body.locationHint
      ? String(body.locationHint)
      : undefined;
    const useEdit = Boolean(body.useEdit);
    const rawRef = body.referencePath ? String(body.referencePath) : "";
    const refUrl = rawRef
      ? rawRef.startsWith("/")
        ? rawRef
        : `/${rawRef}`
      : "";
    const referencePath =
      refUrl && resolvePublicAsset(refUrl) ? refUrl : undefined;

    if (!scenePrompt) {
      return NextResponse.json(
        { error: "Chybí prompt" },
        { status: 400, headers: noStore }
      );
    }

    const promptParts = [
      scenePrompt,
      `Camera: ${cameraType}`,
      locationHint ? `Location: ${locationHint}` : null,
      "Cinematic still, film still, high detail, consistent character design",
    ].filter(Boolean);

    const b64 = await generateImage({
      prompt: promptParts.join(". "),
      useEdit: useEdit && Boolean(referencePath),
      referencePath,
    });

    const filename = `panel-${randomUUID()}.png`;
    const dest = path.join(GENERATED_DIR, filename);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));

    return NextResponse.json(
      { imageUrl: publicUrl(dest) },
      { headers: noStore }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generování selhalo";
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
