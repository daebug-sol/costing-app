import { isTourKey, type TourKey, type TourProgress, type TourStatus } from "./types";

const STORAGE_KEY = "costing-tour-progress";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Device mirror of the server progress, so a tour never flashes before GET returns. */
export function readLocalProgress(): TourProgress {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: TourProgress = {};
    for (const [key, status] of Object.entries(parsed)) {
      if (isTourKey(key) && (status === "done" || status === "skipped")) out[key] = status;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocalProgress(progress: TourProgress) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or full storage: the server copy still holds.
  }
}

async function putProgress(key: TourKey, status: TourStatus | null): Promise<void> {
  try {
    await fetch("/api/tutorials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status }),
    });
  } catch {
    // Offline: the local mirror keeps the tour closed; loadProgress resends it.
  }
}

/** Saves locally first, then on the server; never throws. */
export async function saveProgress(key: TourKey, status: TourStatus | null): Promise<void> {
  const next = { ...readLocalProgress() };
  if (status === null) delete next[key];
  else next[key] = status;
  writeLocalProgress(next);
  await putProgress(key, status);
}

/**
 * Server progress merged over the local mirror; local-only keys (a save that
 * failed earlier) are sent again. Null when the server refuses (e.g. an
 * expired demo), which means no tutorial should show.
 */
export async function loadProgress(): Promise<{
  progress: TourProgress;
  displayName: string | null;
} | null> {
  let json: { progress?: TourProgress; displayName?: string | null };
  try {
    const res = await fetch("/api/tutorials", { cache: "no-store" });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }
  const server = json.progress ?? {};
  const local = readLocalProgress();
  for (const [key, status] of Object.entries(local)) {
    if (isTourKey(key) && !server[key] && status) void putProgress(key, status);
  }
  const progress = { ...local, ...server };
  writeLocalProgress(progress);
  return { progress, displayName: json.displayName ?? null };
}
