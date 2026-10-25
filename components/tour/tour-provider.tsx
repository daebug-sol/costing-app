"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TUTORIALS } from "@/content/tutorials";
import { subscribeTourEvents } from "@/lib/tour/events";
import {
  claimForcedTour,
  mergeStatus,
  pickAutoTour,
  routeMatches,
  tourReducer,
  type TourAction,
  type TourState,
} from "@/lib/tour/machine";
import { loadProgress, saveProgress } from "@/lib/tour/progress-client";
import type { TourContext, TourKey, TourProgress } from "@/lib/tour/types";
import { useCostingStore } from "@/store/costingStore";
import { TourCard } from "./tour-card";
import { TourInvite } from "./tour-invite";
import { TourSpotlight } from "./tour-spotlight";
import { useIsDesktop, useTourTarget } from "./use-tour-target";

type TourApi = {
  state: TourState;
  progress: TourProgress;
  start: (key: TourKey) => void;
  skip: () => void;
  next: () => void;
};

const TourContextReact = createContext<TourApi | null>(null);

export function useTour(): TourApi {
  const api = useContext(TourContextReact);
  if (!api) throw new Error("useTour must be used inside TourProvider");
  return api;
}

const IDLE: TourState = { status: "idle" };

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const permissions = useCostingStore((s) => s.permissions);
  const ahu = useCostingStore((s) => s.modules.ahu);
  const orgLoaded = useCostingStore((s) => s.orgLoaded);
  const isDesktop = useIsDesktop();
  const ctx: TourContext = useMemo(
    () => ({ permissions, modules: { ahu }, isDesktop }),
    [permissions, ahu, isDesktop]
  );

  const [state, setState] = useState<TourState>(IDLE);
  const stateRef = useRef(state);
  const [progress, setProgress] = useState<TourProgress>({});
  const progressRef = useRef<TourProgress>({});
  const [loaded, setLoaded] = useState<{ displayName: string | null; autoStart: boolean } | null>(
    null
  );
  const handledSearch = useRef<string | null>(null);

  const dispatch = useCallback((action: TourAction) => {
    const { state: next, effect } = tourReducer(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    if (effect) {
      const { key } = effect.save;
      const status = mergeStatus(progressRef.current[key], effect.save.status);
      progressRef.current = { ...progressRef.current, [key]: status };
      setProgress(progressRef.current);
      void saveProgress(key, status);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadProgress().then((result) => {
      if (cancelled || !result) return;
      progressRef.current = result.progress;
      setProgress(result.progress);
      setLoaded({ displayName: result.displayName, autoStart: result.autoStart });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeTourEvents((name) => dispatch({ type: "event", name })), [dispatch]);

  useEffect(() => {
    dispatch({ type: "route", pathname });
  }, [pathname, dispatch]);

  // Decide what opens by itself on this route once the server progress and the
  // org caps are in: `when` filters and the permission gate read ctx at start.
  useEffect(() => {
    if (!loaded || !orgLoaded) return;
    const claim = claimForcedTour(
      handledSearch.current,
      window.location.pathname,
      window.location.search
    );
    handledSearch.current = claim.handled;
    const forced = claim.key;
    if (!forced && !loaded.autoStart) return;
    if (!forced && stateRef.current.status === "running") return;
    const pick = pickAutoTour({ pathname, progress, ctx, forced, tutorials: TUTORIALS });
    if (!pick) return;
    if (pick.kind === "run") dispatch({ type: "start", def: TUTORIALS[pick.key], ctx });
    else dispatch({ type: "invite", key: pick.key });
  }, [loaded, orgLoaded, pathname, progress, ctx, dispatch]);

  const start = useCallback(
    (key: TourKey) => dispatch({ type: "start", def: TUTORIALS[key], ctx }),
    [dispatch, ctx]
  );
  const skip = useCallback(() => dispatch({ type: "skip" }), [dispatch]);
  const next = useCallback(() => dispatch({ type: "next" }), [dispatch]);

  const api = useMemo(
    () => ({ state, progress, start, skip, next }),
    [state, progress, start, skip, next]
  );

  return (
    <TourContextReact.Provider value={api}>
      {children}
      {state.status === "running" ? (
        <RunningTour
          state={state}
          isDesktop={isDesktop}
          displayName={loaded?.displayName ?? null}
          onNext={next}
          onSkip={skip}
          onMissing={() => dispatch({ type: "target-missing" })}
        />
      ) : null}
      {state.status === "invite" &&
      TUTORIALS[state.key].route &&
      routeMatches(TUTORIALS[state.key].route!, pathname) ? (
        <TourInvite def={TUTORIALS[state.key]} onStart={() => start(state.key)} onSkip={skip} />
      ) : null}
    </TourContextReact.Provider>
  );
}

function RunningTour({
  state,
  isDesktop,
  displayName,
  onNext,
  onSkip,
  onMissing,
}: {
  state: Extract<TourState, { status: "running" }>;
  isDesktop: boolean;
  displayName: string | null;
  onNext: () => void;
  onSkip: () => void;
  onMissing: () => void;
}) {
  const step = state.steps[state.index];
  const targetName = (isDesktop ? step.target : step.targetMobile ?? step.target) ?? null;
  const { rect } = useTourTarget(targetName, `${state.key}:${step.id}:${targetName}`, onMissing);
  // While the target is still being looked for, render nothing (never block the page).
  if (targetName !== null && !rect) return null;
  return (
    <>
      <TourSpotlight rect={rect} />
      <TourCard
        step={step}
        index={state.index}
        total={state.steps.length}
        rect={rect}
        isDesktop={isDesktop}
        displayName={displayName}
        onNext={onNext}
        onSkip={onSkip}
      />
    </>
  );
}
