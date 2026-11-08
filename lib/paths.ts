import fs from "fs";
import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
export const GENERATED_DIR = path.join(process.cwd(), "public", "generated");
export const ANIMATIONS_DIR = path.join(process.cwd(), "public", "animations");

export function ensureDirs() {
  for (const dir of [DATA_DIR, PROJECTS_DIR, UPLOADS_DIR, GENERATED_DIR, ANIMATIONS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function publicUrl(absPath: string): string {
  const rel = path.relative(path.join(process.cwd(), "public"), absPath);
  return "/" + rel.split(path.sep).join("/");
}
