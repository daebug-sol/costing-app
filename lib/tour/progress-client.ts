import { isTourKey, type TourKey, type TourProgress, type TourStatus } from "./types";

const STORAGE_KEY = "costing-tour-progress";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

type Mirror = { owner: string | null; progress: TourProgress };

/** `orgId:userId` the mirror belongs to, learned from the last GET. */
let currentOwner: string | null = null;

function readMirror(): Mirror {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return { owner: null, progress: {} };
  try {
    const parsed = JSON.parse(raw) as { owner?: unknown; progress?: Record<string, unknown> };
    const out: TourProgress = {};
    for (const [key, status] of Object.entries(parsed.progress ?? {})) {
      if (isTourKey(key) && (status === "done" || status === "skipped")) out[key] = status;
    }
    return { owner: typeof parsed.owner === "string" ? parsed.owner : null, progress: out };
  } catch {
    return { owner: null, progress: {} };
  }
}

function writeMirror(progress: TourProgress) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify({ owner: currentOwner, progress }));
  } catch {
    // Private mode or full storage: the server copy still holds.
  }
}

/**
 * Device mirror of the server progress, so a tour never flashes before GET
 * returns. Empty when it was written for another user or org on this browser.
 */
export function readLocalProgress(): TourProgress {
  const mirror = readMirror();
  if (currentOwner && mirror.owner !== currentOwner) return {};
  return mirror.progress;
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
  writeMirror(next);
  await putProgress(key, status);
}

/**
 * Server progress merged over the local mirror; local-only keys (a save that
 * failed earlier) are sent again. Null when the server refuses (e.g. an
 * expired demo), which means no tutorial should show.
 */
export type LoadedProgress = {
  progress: TourProgress;
  displayName: string | null;
  /** False in the test harness: tutorials then open only via ?tour=. */
  autoStart: boolean;
  /** `orgId:userId` this progress belongs to. */
  owner: string | null;
};

export async function loadProgress(): Promise<LoadedProgress | null> {
  let json: {
    progress?: TourProgress;
    displayName?: string | null;
    autoStart?: boolean;
    owner?: string;
  };
  try {
    const res = await fetch("/api/tutorials", { cache: "no-store" });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }
  const server = json.progress ?? {};
  const mirror = readMirror();
  currentOwner = json.owner ?? null;
  // Only this user's own unsent saves are resent; another user's mirror is dropped.
  const local = mirror.owner === currentOwner ? mirror.progress : {};
  for (const [key, status] of Object.entries(local)) {
    if (isTourKey(key) && !server[key] && status) void putProgress(key, status);
  }
  const progress = { ...local, ...server };
  writeMirror(progress);
  return {
    progress,
    displayName: json.displayName ?? null,
    autoStart: json.autoStart !== false,
    owner: currentOwner,
  };
}
