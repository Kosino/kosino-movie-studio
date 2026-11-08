"use client";

import { useState } from "react";

interface Panel {
  id: string;
  prompt: string;
  cameraType: string;
  duration: number;
  imageUrl?: string;
}

interface Project {
  id?: string;
  name: string;
  panels: Panel[];
  characterRefs: string[];
  locationRefs: string[];
}

const CAMERA_TYPES = ["Wide", "Medium", "Close-up", "Aerial", "Low angle"];

export default function Home() {
  const [project, setProject] = useState<Project>({
    name: "Kosino – Intro",
    panels: [],
    characterRefs: [],
    locationRefs: [],
  });
  const [shotListText, setShotListText] = useState("");
  const [loading, setLoading] = useState(false);
  const [useEdit, setUseEdit] = useState(true);

  async function upload(type: "character" | "location", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    const res = await fetch("/api/upload-reference", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Upload selhal");
      return;
    }
    setProject((p) => ({
      ...p,
      [type === "character" ? "characterRefs" : "locationRefs"]: [
        ...(type === "character" ? p.characterRefs : p.locationRefs),
        data.path,
      ],
    }));
  }

  async function parseShotList() {
    if (!shotListText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/parse-shotlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: shotListText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const panels: Panel[] = data.shots.map((s: string, i: number) => ({
        id: Date.now() + "-" + i,
        prompt: s,
        cameraType: "Wide",
        duration: 3,
      }));
      setProject((p) => ({ ...p, panels }));
      document.getElementById("storyboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Parse selhal");
    } finally {
      setLoading(false);
    }
  }

  async function generatePanel(index: number) {
    setLoading(true);
    try {
      const panel = project.panels[index];
      const res = await fetch("/api/generate-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt: panel.prompt,
          useEdit,
          referencePath: project.characterRefs[0],
          cameraType: panel.cameraType,
          locationHint: project.locationRefs.length ? "Most city center, golden hour" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProject((p) => {
        const panels = [...p.panels];
        panels[index] = { ...panels[index], imageUrl: data.imageUrl };
        return { ...p, panels };
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Generování selhalo");
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const saved = await res.json();
    if (!res.ok) {
      alert(saved.error || "Uložení selhalo");
      return;
    }
    setProject(saved);
    alert("Projekt uložen");
  }

  async function animate() {
    const urls = project.panels.map((p) => p.imageUrl).filter(Boolean);
    const res = await fetch("/api/animate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls: urls, projectId: project.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Animace selhala");
      return;
    }
    alert(data.videoUrl ? `Animace připravena: ${data.videoUrl}` : "Animace připravena");
  }

  function addEmptyPanel() {
    setProject((p) => ({
      ...p,
      panels: [
        ...p.panels,
        { id: Date.now().toString(), prompt: "New shot...", cameraType: "Wide", duration: 3 },
      ],
    }));
  }

  return (
    <div className="page">
      <section className="hero" aria-label="Kosino Movie Studio">
        <div className="hero__media" aria-hidden>
          <img src="/hero-cinema.jpg" alt="" />
          <div className="hero__veil" />
        </div>
        <div className="hero__content">
          <div className="brand">
            <div className="brand__mark">Kosino</div>
            <div className="brand__sub">Movie Studio</div>
          </div>
          <h1 className="hero__headline">Storyboard, který drží postavu i místo.</h1>
          <p className="hero__support">
            Character Lock, Location Lock a shot list v jednom klidném pracovním prostoru.
          </p>
          <div className="cta-row">
            <a className="btn btn--primary" href="#studio">
              Otevřít studio
            </a>
            <a className="btn btn--ghost" href="#shotlist">
              Vložit shot list
            </a>
          </div>
        </div>
      </section>

      <main id="studio" className="studio">
        <div className="studio__bar">
          <div className="studio__bar-label">Pracovní prostor</div>
          <div className="studio__actions">
            <button type="button" className="btn btn--quiet btn--small" onClick={saveProject}>
              Uložit
            </button>
            <button type="button" className="btn btn--ink btn--small" onClick={animate}>
              Animovat
            </button>
          </div>
        </div>

        <input
          className="project-name"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          aria-label="Název projektu"
        />

        <section className="section" aria-labelledby="locks-title">
          <p className="section__eyebrow">Reference</p>
          <h2 id="locks-title" className="section__title">
            Zamkni postavu a lokaci
          </h2>
          <p className="section__hint">
            Nahraj vizuální kotvy. Image Editing drží konzistenci při generování panelů.
          </p>
          <div className="lock-grid">
            <div className="surface">
              <h3 className="surface__title">Character Lock</h3>
              <div className="thumb-row">
                {project.characterRefs.map((r) => (
                  <img key={r} src={r} alt="" className="thumb" />
                ))}
                <label className="upload">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => upload("character", e)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={useEdit}
                  onChange={(e) => setUseEdit(e.target.checked)}
                />
                Image Editing
              </label>
            </div>

            <div className="surface">
              <h3 className="surface__title">Location Lock</h3>
              <div className="thumb-row">
                {project.locationRefs.map((r) => (
                  <img key={r} src={r} alt="" className="thumb" />
                ))}
                <label className="upload">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => upload("location", e)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section id="shotlist" className="section" aria-labelledby="shotlist-title">
          <p className="section__eyebrow">Shot list</p>
          <h2 id="shotlist-title" className="section__title">
            Rozlož scénář na panely
          </h2>
          <p className="section__hint">Vlož shot list nebo scénář — studio z něj sestaví storyboard.</p>
          <div className="surface">
            <textarea
              className="field"
              value={shotListText}
              onChange={(e) => setShotListText(e.target.value)}
              placeholder="Vlož shot list nebo scénář..."
              rows={4}
            />
            <div className="shot-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={parseShotList}
                disabled={loading}
              >
                Vytvořit panely
              </button>
            </div>
          </div>
        </section>

        <section id="storyboard" className="section" aria-labelledby="storyboard-title">
          <div className="storyboard-head">
            <div>
              <p className="section__eyebrow">Storyboard</p>
              <h2 id="storyboard-title" className="section__title">
                Panely a kamera
              </h2>
              <p className="section__hint" style={{ marginBottom: 0 }}>
                Uprav prompt, typ záběru a délku — pak generuj nebo regeneruj.
              </p>
            </div>
            <button type="button" className="btn btn--quiet btn--small" onClick={addEmptyPanel}>
              + Panel
            </button>
          </div>

          {project.panels.length === 0 ? (
            <p className="empty">Zatím žádné panely. Vlož shot list výše, nebo přidej panel ručně.</p>
          ) : (
            <div className="panel-grid">
              {project.panels.map((panel, i) => (
                <div
                  key={panel.id}
                  className="surface panel"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                >
                  <div className="panel__meta">
                    <span className="panel__index">{String(i + 1).padStart(2, "0")}</span>
                    <select
                      className="select"
                      style={{ width: "auto" }}
                      value={panel.cameraType}
                      onChange={(e) => {
                        const panels = [...project.panels];
                        panels[i].cameraType = e.target.value;
                        setProject({ ...project, panels });
                      }}
                    >
                      {CAMERA_TYPES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="field"
                    value={panel.prompt}
                    onChange={(e) => {
                      const panels = [...project.panels];
                      panels[i].prompt = e.target.value;
                      setProject({ ...project, panels });
                    }}
                    rows={3}
                  />
                  <div className="panel__footer">
                    <input
                      className="number"
                      type="number"
                      value={panel.duration}
                      onChange={(e) => {
                        const panels = [...project.panels];
                        panels[i].duration = Number(e.target.value);
                        setProject({ ...project, panels });
                      }}
                      aria-label="Délka panelu"
                    />
                    <button
                      type="button"
                      className="btn btn--primary btn--small"
                      onClick={() => generatePanel(i)}
                      disabled={loading}
                    >
                      {panel.imageUrl ? "Regenerovat" : "Generovat"}
                    </button>
                  </div>
                  {panel.imageUrl && (
                    <img src={panel.imageUrl} alt="" className="panel__image" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
