import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { ensureDirs, UPLOADS_DIR, publicUrl } from "@/lib/paths";
import { resolveUnderRoot } from "@/lib/safe-path";
import { requireCaller } from "@/lib/require-auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };
const ALLOWED_TYPES = new Set(["character", "location"]);
const ALLOWED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
]);

export async function POST(req: NextRequest) {
  const identity = await requireCaller(req);
  if (identity instanceof Response) return identity;

  try {
    ensureDirs();
    const form = await req.formData();
    const file = form.get("file");
    const typeRaw = String(form.get("type") || "character");
    const type = ALLOWED_TYPES.has(typeRaw) ? typeRaw : "character";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Chybí soubor" },
        { status: 400, headers: noStore }
      );
    }

    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: "Nepodporovaný typ souboru" },
        { status: 400, headers: noStore }
      );
    }

    const filename = `${type}-${randomUUID()}${ext}`;
    const dest = resolveUnderRoot(UPLOADS_DIR, filename);
    if (!dest) {
      return NextResponse.json(
        { error: "Neplatná cesta" },
        { status: 400, headers: noStore }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    return NextResponse.json(
      {
        path: publicUrl(dest),
        type,
      },
      { headers: noStore }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload selhal";
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
