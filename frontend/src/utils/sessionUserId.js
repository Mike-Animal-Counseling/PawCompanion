/**
 * Anonymous session userId (no auth, no backend changes).
 * Uses localStorage so the same browser/device keeps the same id across refreshes.
 */
const STORAGE_KEY = "cat_delivery_user_id";

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    "anon_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11)
  );
}

export function getOrCreateUserId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && typeof stored === "string" && stored.trim()) return stored;
    const id = generateId();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage may be blocked; fall back to ephemeral id
    return generateId();
  }
}

export function clearSessionUserId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

