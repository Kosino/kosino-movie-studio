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
      panels: [...p.panels, { id: Date.now().toString(), prompt: "New shot...", cameraType: "Wide", duration: 3 }],
    }));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0e", color: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <header style={{ padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#d4af37,#f4e4bc)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#000", fontSize: 14 }}>K</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Kosino</div>
            <div style={{ fontSize: 11, color: "#86868b" }}>Movie Studio</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveProject} style={btnSecondary}>Uložit</button>
          <button onClick={animate} style={btnPrimary}>Animovat</button>
        </div>
      </header>

      <main style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <input
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          style={{ background: "transparent", border: "none", fontSize: 34, fontWeight: 600, color: "#f5f5f7", width: "100%", outline: "none", marginBottom: 28 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          <section style={card}>
            <h3 style={sectionTitle}>Character Lock</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {project.characterRefs.map((r) => (
                <img key={r} src={r} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
              ))}
              <label style={uploadBox}>
                +
                <input type="file" accept="image/*" onChange={(e) => upload("character", e)} style={{ display: "none" }} />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "#86868b" }}>
              <input type="checkbox" checked={useEdit} onChange={(e) => setUseEdit(e.target.checked)} />
              Image Editing
            </label>
          </section>

          <section style={card}>
            <h3 style={sectionTitle}>Location Lock</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {project.locationRefs.map((r) => (
                <img key={r} src={r} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
              ))}
              <label style={uploadBox}>
                +
                <input type="file" accept="image/*" onChange={(e) => upload("location", e)} style={{ display: "none" }} />
              </label>
            </div>
          </section>
        </div>

        <section style={{ ...card, marginBottom: 28 }}>
          <h3 style={sectionTitle}>Shot List</h3>
          <textarea
            value={shotListText}
            onChange={(e) => setShotListText(e.target.value)}
            placeholder="Vlož shot list nebo scénář..."
            rows={3}
            style={textarea}
          />
          <button onClick={parseShotList} disabled={loading} style={{ ...btnPrimary, marginTop: 10 }}>
            Vytvořit panely
          </button>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={sectionTitle}>Storyboard</h3>
            <button onClick={addEmptyPanel} style={btnSecondary}>+ Panel</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {project.panels.map((panel, i) => (
              <div key={panel.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#86868b" }}>0{i + 1}</span>
                  <select
                    value={panel.cameraType}
                    onChange={(e) => {
                      const panels = [...project.panels];
                      panels[i].cameraType = e.target.value;
                      setProject({ ...project, panels });
                    }}
                    style={{ background: "#1c1c1e", color: "#f5f5f7", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}
                  >
                    {CAMERA_TYPES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={panel.prompt}
                  onChange={(e) => {
                    const panels = [...project.panels];
                    panels[i].prompt = e.target.value;
                    setProject({ ...project, panels });
                  }}
                  rows={2}
                  style={{ ...textarea, marginBottom: 8 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <input
                    type="number"
                    value={panel.duration}
                    onChange={(e) => {
                      const panels = [...project.panels];
                      panels[i].duration = Number(e.target.value);
                      setProject({ ...project, panels });
                    }}
                    style={{ width: 50, background: "#1c1c1e", color: "#f5f5f7", border: "none", borderRadius: 6, padding: 4 }}
                  />
                  <button onClick={() => generatePanel(i)} disabled={loading} style={btnPrimary}>
                    {panel.imageUrl ? "Regenerovat" : "Generovat"}
                  </button>
                </div>
                {panel.imageUrl && (
                  <img src={panel.imageUrl} alt="" style={{ width: "100%", borderRadius: 10, marginTop: 12 }} />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: "#86868b",
};

const btnPrimary: React.CSSProperties = {
  background: "#0071e3",
  color: "white",
  border: "none",
  borderRadius: 980,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "#f5f5f7",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 980,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const uploadBox: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 10,
  border: "1px dashed rgba(255,255,255,0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#86868b",
  fontSize: 22,
};

const textarea: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: 10,
  color: "#f5f5f7",
  fontSize: 14,
  fontFamily: "inherit",
  resize: "vertical",
  outline: "none",
};
