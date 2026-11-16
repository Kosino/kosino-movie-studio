import { NextRequest, NextResponse } from "next/server";
import { getProject, listProjects, saveProject } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { requireCaller } from "@/lib/require-auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const identity = await requireCaller(req);
  if (identity instanceof Response) return identity;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const project = getProject(id);
      if (!project) {
        return NextResponse.json(
          { error: "Projekt nenalezen" },
          { status: 404, headers: noStore }
        );
      }
      return NextResponse.json(project, { headers: noStore });
    }
    return NextResponse.json({ projects: listProjects() }, { headers: noStore });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Načtení selhalo";
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  const identity = await requireCaller(req);
  if (identity instanceof Response) return identity;

  try {
    const body = (await req.json()) as Project;
    if (!body || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Neplatný projekt" },
        { status: 400, headers: noStore }
      );
    }
    const saved = saveProject({
      id: body.id,
      name: body.name,
      panels: Array.isArray(body.panels) ? body.panels : [],
      characterRefs: Array.isArray(body.characterRefs) ? body.characterRefs : [],
      locationRefs: Array.isArray(body.locationRefs) ? body.locationRefs : [],
      createdAt: body.createdAt,
    });
    return NextResponse.json(saved, { headers: noStore });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Uložení selhalo";
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
