import { requireIdentity } from "../cursor/identity";

/**
 * Require a verified Cursor app viewer (or simulated local viewer) on API routes.
 * Returns the identity, or a 401 Response to return as-is.
 */
export async function requireCaller(request: Request) {
  return requireIdentity(request);
}
