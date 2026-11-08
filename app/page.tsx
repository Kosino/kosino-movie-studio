"use client";

import { useMemo, useState } from "react";

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

function IconWing({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M4 18c6-1 10-6 12-12 1 5 4 9 10 11-5 1-8 4-9 9-2-5-6-7-13-8z" />
      <path d="M14 22c3 .4 5 2.2 6 5.5-2.2-.6-4.2-1.8-6-5.5z" opacity="0.7" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 3h11l3 3v15H5V3z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.2 6.3L19 10l-5.8 1.7L12 18l-1.2-6.3L5 10l5.8-1.7L12 2z" />
      <path d="M19 14l.6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14z" opacity="0.85" />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.6-6.3" strokeLinecap="round" />
      <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(0);

  const totalDuration = useMemo(
    () => project.panels.reduce((sum, p) => sum + (Number(p.duration) || 0), 0),
    [project.panels]
  );

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
    setProject((p) => {
      const key = type === "character" ? "characterRefs" : "locationRefs";
      const next = [...p[key], data.path];
      return { ...p, [key]: next };
    });
    if (type === "character") setSelectedCharacter((i) => (project.characterRefs.length === 0 ? 0 : i));
    e.target.value = "";
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
      const characterRef = project.characterRefs[selectedCharacter] || project.characterRefs[0];
      const res = await fetch("/api/generate-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenePrompt: panel.prompt,
          useEdit,
          referencePath: characterRef,
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

  function updatePanel(index: number, patch: Partial<Panel>) {
    setProject((p) => {
      const panels = [...p.panels];
      panels[index] = { ...panels[index], ...patch };
      return { ...p, panels };
    });
  }

  function renderLockSlots(
    refs: string[],
    selected: number,
    onSelect: (i: number) => void,
    type: "character" | "location"
  ) {
    const slots = Array.from({ length: 4 }, (_, i) => refs[i] || null);
    return (
      <div className="thumb-row">
        {slots.map((src, i) =>
          src ? (
            <button
              key={`${type}-${src}-${i}`}
              type="button"
              className={`thumb${selected === i ? " is-selected" : ""}`}
              onClick={() => onSelect(i)}
              aria-label={`${type} reference ${i + 1}`}
            >
              <img src={src} alt="" />
              {selected === i && <span className="thumb__check">✓</span>}
            </button>
          ) : (
            <label key={`${type}-empty-${i}`} className="upload-slot">
              +
              <input
                type="file"
                accept="image/*"
                onChange={(e) => upload(type, e)}
                style={{ display: "none" }}
              />
            </label>
          )
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <IconWing className="brand__logo" />
          <div className="brand__name">Kosino Movie Studio</div>
        </div>
        <div className="topbar__actions">
          <button type="button" className="btn btn--quiet" onClick={saveProject}>
            <IconSave />
            Uložit
          </button>
          <button type="button" className="btn btn--primary" onClick={animate}>
            <IconSpark />
            Animovat
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <input
            className="project-name"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            aria-label="Název projektu"
          />

          <section className="section">
            <h2 className="section__label">
              <IconLock /> Character Lock
            </h2>
            {renderLockSlots(
              project.characterRefs,
              selectedCharacter,
              setSelectedCharacter,
              "character"
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={useEdit}
                onChange={(e) => setUseEdit(e.target.checked)}
              />
              Image Editing
            </label>
          </section>

          <section className="section">
            <h2 className="section__label">
              <IconLock /> Location Lock
            </h2>
            {renderLockSlots(
              project.locationRefs,
              selectedLocation,
              setSelectedLocation,
              "location"
            )}
          </section>

          <section className="section">
            <h2 className="section__label">
              <IconList /> Shot List
            </h2>
            <div className="shotlist-box">
              <textarea
                className="shotlist-input"
                value={shotListText}
                onChange={(e) => setShotListText(e.target.value)}
                placeholder="Vlož shot list nebo scénář..."
                rows={3}
              />
              <div className="shotlist-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ borderRadius: 8, padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                  onClick={parseShotList}
                  disabled={loading}
                >
                  Vytvořit panely
                </button>
              </div>
              {project.panels.length > 0 && (
                <ul className="shot-rows">
                  {project.panels.map((panel, i) => (
                    <li key={panel.id} className="shot-row">
                      <span className="shot-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="shot-title" title={panel.prompt}>
                        {panel.prompt}
                      </span>
                      <span className="pill">{panel.cameraType}</span>
                      <span className="shot-dur">{Number(panel.duration).toFixed(1)}s</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="shotlist-total">
                <span>
                  <IconSpark />
                  Total Duration: <strong>{totalDuration.toFixed(1)}s</strong>
                </span>
              </div>
            </div>
          </section>
        </aside>

        <main className="main" id="storyboard">
          <div className="story-head">
            <p className="eyebrow" style={{ marginBottom: 0 }}>
              Storyboard
            </p>
            <button type="button" className="btn btn--ghost" onClick={addEmptyPanel}>
              + Panel
            </button>
          </div>

          {project.panels.length === 0 ? (
            <p className="empty">Zatím žádné panely. Vlož shot list vlevo, nebo přidej panel ručně.</p>
          ) : (
            <div className="panel-grid">
              {project.panels.map((panel, i) => (
                <article
                  key={panel.id}
                  className="card"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
                >
                  <div className="card__media">
                    <span className="card__badge">{String(i + 1).padStart(2, "0")}</span>
                    <div className="card__cam">
                      <select
                        value={panel.cameraType}
                        onChange={(e) => updatePanel(i, { cameraType: e.target.value })}
                        aria-label="Typ kamery"
                      >
                        {CAMERA_TYPES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {panel.imageUrl ? (
                      <img src={panel.imageUrl} alt="" />
                    ) : (
                      <div className="card__placeholder">Bez obrázku</div>
                    )}
                  </div>
                  <div className="card__body">
                    <textarea
                      className="card__prompt"
                      value={panel.prompt}
                      onChange={(e) => updatePanel(i, { prompt: e.target.value })}
                      rows={2}
                    />
                    <div className="card__footer">
                      <input
                        className="card__dur"
                        type="number"
                        step="0.5"
                        value={panel.duration}
                        onChange={(e) => updatePanel(i, { duration: Number(e.target.value) })}
                        aria-label="Délka"
                      />
                      <button
                        type="button"
                        className="btn btn--icon"
                        onClick={() => generatePanel(i)}
                        disabled={loading}
                        title={panel.imageUrl ? "Regenerovat" : "Generovat"}
                        aria-label={panel.imageUrl ? "Regenerovat" : "Generovat"}
                      >
                        <IconRefresh />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
