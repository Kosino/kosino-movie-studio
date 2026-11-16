import path from "path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafeId(id: string): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

/**
 * Resolve `relativePath` under `root`. Returns null if the result escapes the root
 * (including via `..`, absolute segments, or null bytes).
 */
export function resolveUnderRoot(
  root: string,
  relativePath: string
): string | null {
  if (!relativePath || relativePath.includes("\0")) return null;
  if (path.isAbsolute(relativePath)) return null;

  const rootResolved = path.resolve(root);
  const candidate = path.resolve(rootResolved, relativePath);
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : rootResolved + path.sep;

  if (candidate !== rootResolved && !candidate.startsWith(prefix)) {
    return null;
  }
  return candidate;
}

/** Map a public URL (`/uploads/...`) to an absolute file under `public/`. */
export function resolvePublicAsset(url: string): string | null {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return null;
  }
  const clean = url.split("?")[0].split("#")[0];
  const rel = clean.replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return null;

  const publicRoot = path.join(process.cwd(), "public");
  return resolveUnderRoot(publicRoot, rel);
}
