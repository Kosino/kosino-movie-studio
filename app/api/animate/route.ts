import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import { ensureDirs, ANIMATIONS_DIR, publicUrl } from "@/lib/paths";

export const runtime = "nodejs";

function resolvePublicFile(url: string): string | null {
  if (!url.startsWith("/")) return null;
  const abs = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  return fs.existsSync(abs) ? abs : null;
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''");
}

function normalizeFrame(src: string, dest: string): boolean {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      src,
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-frames:v",
      "1",
      "-update",
      "1",
      dest,
    ],
    { encoding: "utf8" }
  );
  return result.status === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 0;
}

export async function POST(req: NextRequest) {
  try {
    ensureDirs();
    const body = await req.json();
    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u: unknown) => typeof u === "string")
      : [];
    const projectId = body.projectId ? String(body.projectId) : randomUUID();
    const secondsPerFrame = Number(body.secondsPerFrame) || 2;

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Žádné obrázky k animaci" },
        { status: 400 }
      );
    }

    const files = imageUrls
      .map(resolvePublicFile)
      .filter((f): f is string => Boolean(f));

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Soubory obrázků nenalezeny" },
        { status: 400 }
      );
    }

    const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
    if (ffmpegCheck.error || ffmpegCheck.status !== 0) {
      return NextResponse.json(
        {
          error: "ffmpeg není nainstalovaný",
          stub: true,
          frameCount: files.length,
        },
        { status: 503 }
      );
    }

    const workDir = path.join(ANIMATIONS_DIR, `work-${projectId}`);
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });

    const normalized: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const dest = path.join(workDir, `frame-${String(i + 1).padStart(4, "0")}.png`);
      if (!normalizeFrame(files[i], dest)) {
        return NextResponse.json(
          { error: `Nepodařilo se připravit frame ${i + 1}` },
          { status: 500 }
        );
      }
      normalized.push(dest);
    }

    const listFile = path.join(workDir, "list.txt");
    const duration = Math.max(secondsPerFrame, 0.2);
    const lines: string[] = [];
    for (const f of normalized) {
      lines.push(`file '${escapeConcatPath(f)}'`);
      lines.push(`duration ${duration}`);
    }
    lines.push(`file '${escapeConcatPath(normalized[normalized.length - 1])}'`);
    fs.writeFileSync(listFile, lines.join("\n") + "\n", "utf8");

    const outPath = path.join(ANIMATIONS_DIR, `${projectId}.mp4`);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    const result = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        outPath,
      ],
      { encoding: "utf8" }
    );

    if (result.status !== 0 || !fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      return NextResponse.json(
        {
          error: "ffmpeg selhal",
          details: (result.stderr || result.stdout || "").slice(-2000),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      videoUrl: publicUrl(outPath),
      projectId,
      frameCount: normalized.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Animace selhala";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
