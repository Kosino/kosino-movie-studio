import fs from "fs";
import { randomUUID } from "crypto";
import type { Project } from "./types";
import { ensureDirs, PROJECTS_DIR } from "./paths";
import { isSafeId, resolveUnderRoot } from "./safe-path";

function projectFilePath(id: string): string | null {
  if (!isSafeId(id)) return null;
  return resolveUnderRoot(PROJECTS_DIR, `${id}.json`);
}

export function listProjects(): Project[] {
  ensureDirs();
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json") && isSafeId(f.slice(0, -5)))
    .map((f) => {
      const file = resolveUnderRoot(PROJECTS_DIR, f);
      if (!file) return null;
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw) as Project;
    })
    .filter((p): p is Project => Boolean(p))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getProject(id: string): Project | null {
  ensureDirs();
  const file = projectFilePath(id);
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Project;
}

export function saveProject(input: Project): Project {
  ensureDirs();
  const now = new Date().toISOString();
  const id = input.id && isSafeId(input.id) ? input.id : randomUUID();
  const file = projectFilePath(id);
  if (!file) {
    throw new Error("Neplatné ID projektu");
  }

  const project: Project = {
    ...input,
    id,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  fs.writeFileSync(file, JSON.stringify(project, null, 2), "utf8");
  return project;
}
