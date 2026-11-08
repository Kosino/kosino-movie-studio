import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { generateImage } from "@/lib/xai";
import { ensureDirs, GENERATED_DIR, publicUrl } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    ensureDirs();
    const body = await req.json();
    const scenePrompt = String(body.scenePrompt || "").trim();
    const cameraType = String(body.cameraType || "Wide");
    const locationHint = body.locationHint
      ? String(body.locationHint)
      : undefined;
    const useEdit = Boolean(body.useEdit);
    const referencePath = body.referencePath
      ? String(body.referencePath)
      : undefined;

    if (!scenePrompt) {
      return NextResponse.json({ error: "Chybí prompt" }, { status: 400 });
    }

    const promptParts = [
      scenePrompt,
      `Camera: ${cameraType}`,
      locationHint ? `Location: ${locationHint}` : null,
      "Cinematic still, film still, high detail, consistent character design",
    ].filter(Boolean);

    const b64 = await generateImage({
      prompt: promptParts.join(". "),
      useEdit,
      referencePath,
    });

    const filename = `panel-${randomUUID()}.png`;
    const dest = path.join(GENERATED_DIR, filename);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));

    return NextResponse.json({ imageUrl: publicUrl(dest) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generování selhalo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
