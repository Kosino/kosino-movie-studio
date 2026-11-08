import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { ensureDirs, UPLOADS_DIR, publicUrl } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    ensureDirs();
    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") || "character");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chybí soubor" }, { status: 400 });
    }

    const ext = path.extname(file.name) || ".png";
    const filename = `${type}-${randomUUID()}${ext}`;
    const dest = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    return NextResponse.json({
      path: publicUrl(dest),
      type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload selhal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
