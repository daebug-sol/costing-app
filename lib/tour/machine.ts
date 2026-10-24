import type {
  TourContext,
  TourDefinition,
  TourKey,
  TourProgress,
  TourStatus,
  TourStep,
} from "./types";

export type TourState =
  | { status: "idle" }
  | { status: "invite"; key: TourKey }
  | { status: "running"; key: TourKey; steps: TourStep[]; index: number };

export type TourAction =
  | { type: "invite"; key: TourKey }
  | { type: "start"; def: TourDefinition; ctx: TourContext }
  | { type: "next" }
  | { type: "skip" }
  | { type: "event"; name: string }
  | { type: "route"; pathname: string }
  | { type: "target-missing" };

export type TourEffect = { save: { key: TourKey; status: TourStatus } } | null;

export type TourTransition = { state: TourState; effect: TourEffect };

const IDLE: TourState = { status: "idle" };

/** Routes where no tutorial ever appears. */
const EXCLUDED_PREFIXES = ["/activate", "/operator", "/sign-in", "/sign-up", "/legal"];

export function routeMatches(route: string, pathname: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function visibleSteps(def: TourDefinition, ctx: TourContext): TourStep[] {
  return def.steps.filter((step) => !step.when || step.when(ctx));
}

function advance(state: Extract<TourState, { status: "running" }>): TourTransition {
  const index = state.index + 1;
  if (index >= state.steps.length) {
    return { state: IDLE, effect: { save: { key: state.key, status: "done" } } };
  }
  return { state: { ...state, index }, effect: null };
}

export function tourReducer(state: TourState, action: TourAction): TourTransition {
  const same: TourTransition = { state, effect: null };
  switch (action.type) {
    case "invite":
      return state.status === "running"
        ? same
        : { state: { status: "invite", key: action.key }, effect: null };
    case "start": {
      const steps = visibleSteps(action.def, action.ctx);
      if (steps.length === 0) return { state: IDLE, effect: null };
      return {
        state: { status: "running", key: action.def.key, steps, index: 0 },
        effect: null,
      };
    }
    case "skip":
      if (state.status === "idle") return same;
      return { state: IDLE, effect: { save: { key: state.key, status: "skipped" } } };
    default:
      break;
  }

  if (state.status !== "running") return same;
  const step = state.steps[state.index];
  switch (action.type) {
    case "next":
      return step.kind === "info" ? advance(state) : same;
    case "event":
      return step.kind === "action" && step.advanceOn === action.name
        ? advance(state)
        : same;
    case "route":
      return step.kind === "action" &&
        step.advanceOnRoute !== undefined &&
        action.pathname.startsWith(step.advanceOnRoute)
        ? advance(state)
        : same;
    case "target-missing":
      return advance(state);
  }
}

export type AutoTour = { kind: "run" | "invite"; key: TourKey };

/** What should open by itself on this route, given the user's saved progress. */
export function pickAutoTour(args: {
  pathname: string;
  progress: TourProgress;
  ctx: TourContext;
  forced: TourKey | null;
  tutorials: Record<TourKey, TourDefinition>;
}): AutoTour | null {
  const { pathname, progress, ctx, forced, tutorials } = args;
  if (EXCLUDED_PREFIXES.some((p) => routeMatches(p, pathname))) return null;
  if (forced) return { kind: "run", key: forced };

  const welcome = tutorials.welcome;
  if (!progress.welcome) {
    return visibleSteps(welcome, ctx).length > 0 ? { kind: "run", key: "welcome" } : null;
  }

  const def = Object.values(tutorials).find(
    (d) => d.route !== undefined && routeMatches(d.route, pathname)
  );
  if (!def || progress[def.key]) return null;
  if (def.permission && !ctx.permissions.includes(def.permission)) return null;
  if (visibleSteps(def, ctx).length === 0) return null;
  return { kind: "invite", key: def.key };
}

/** A replayed tour that is skipped stays "done" for the user who finished it once. */
export function mergeStatus(prev: TourStatus | undefined, next: TourStatus): TourStatus {
  return prev === "done" ? "done" : next;
}

const MISSING_AFTER_MS = 3000;

export type MissingTimer = { lastSeenOrStart: number; missing: boolean };

/** Grace period for a step target: 3s after it was last seen (or since the step began). */
export const missingTimer = {
  start(now: number): MissingTimer {
    return { lastSeenOrStart: now, missing: false };
  },
  tick(t: MissingTimer, found: boolean, now: number): MissingTimer {
    if (found) return { lastSeenOrStart: now, missing: false };
    return { ...t, missing: now - t.lastSeenOrStart > MISSING_AFTER_MS };
  },
};
