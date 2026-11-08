/**
 * Thin xAI helpers. Requires XAI_API_KEY at runtime (not at build time).
 * Image generation uses grok-2-image; editing uses the images/edits path when a reference is provided.
 */

const XAI_BASE = "https://api.x.ai/v1";

export function getApiKey(): string | null {
  return process.env.XAI_API_KEY?.trim() || null;
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "Chybí XAI_API_KEY. Nastav ho v .env.local (viz .env.example)."
    );
  }
  return key;
}

export async function parseShotListWithLlm(text: string): Promise<string[] | null> {
  const key = getApiKey();
  if (!key) return null;

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You split a film shot list or screenplay into discrete visual shots. Reply with JSON only: {\"shots\":[\"...\"]}. Each shot is one short English visual prompt suitable for image generation. Keep Czech place/character names.",
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI parse failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as { shots?: string[] };
  return Array.isArray(parsed.shots) ? parsed.shots.filter(Boolean) : null;
}

export function parseShotListLocally(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const shots: string[] = [];
  for (const line of lines) {
    const cleaned = line
      .replace(/^[-*•]+\s*/, "")
      .replace(/^(shot|panel|sc[ée]na|záběr)\s*\d+[:.\-\)]\s*/i, "")
      .replace(/^\d+[:.\-\)]\s*/, "")
      .trim();
    if (cleaned) shots.push(cleaned);
  }

  if (shots.length === 0 && text.trim()) {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);
  }
  return shots;
}

export async function generateImage(opts: {
  prompt: string;
  useEdit?: boolean;
  referencePath?: string;
}): Promise<string> {
  const key = requireApiKey();
  const { prompt, useEdit, referencePath } = opts;

  if (useEdit && referencePath) {
    try {
      return await editImage({ key, prompt, referencePath });
    } catch {
      // Fall through to plain generation if edit endpoint is unavailable
    }
  }

  const res = await fetch(`${XAI_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI image generation failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  const url = data.data?.[0]?.url as string | undefined;
  if (b64) return b64;
  if (url) {
    const img = await fetch(url);
    const buf = Buffer.from(await img.arrayBuffer());
    return buf.toString("base64");
  }
  throw new Error("xAI response neobsahuje obrázek");
}

async function editImage(opts: {
  key: string;
  prompt: string;
  referencePath: string;
}): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const { key, prompt, referencePath } = opts;

  const abs = referencePath.startsWith("/")
    ? path.join(process.cwd(), "public", referencePath)
    : path.join(process.cwd(), referencePath);

  if (!fs.existsSync(abs)) {
    throw new Error(`Reference not found: ${referencePath}`);
  }

  const bytes = fs.readFileSync(abs);
  const form = new FormData();
  form.append("model", "grok-2-image");
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("response_format", "b64_json");
  form.append(
    "image",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    path.basename(abs)
  );

  const res = await fetch(`${XAI_BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI image edit failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) throw new Error("xAI edit response neobsahuje obrázek");
  return b64;
}
