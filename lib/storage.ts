import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Project } from "./types";
import { ensureDirs, PROJECTS_DIR } from "./paths";

export function listProjects(): Project[] {
  ensureDirs();
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8");
      return JSON.parse(raw) as Project;
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getProject(id: string): Project | null {
  ensureDirs();
  const file = path.join(PROJECTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Project;
}

export function saveProject(input: Project): Project {
  ensureDirs();
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: input.id || randomUUID(),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  fs.writeFileSync(
    path.join(PROJECTS_DIR, `${project.id}.json`),
    JSON.stringify(project, null, 2),
    "utf8"
  );
  return project;
}
