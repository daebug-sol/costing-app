import {
  pickAutoTour,
  tourReducer,
  visibleSteps,
  type TourState,
} from "@/lib/tour/machine";
import type {
  TourContext,
  TourDefinition,
  TourKey,
  TourStep,
} from "@/lib/tour/types";

const L = { id: "x", en: "x" };
const info = (id: string, extra: Partial<TourStep> = {}): TourStep => ({
  id,
  kind: "info",
  title: L,
  body: L,
  ...extra,
});
const action = (id: string, extra: Partial<TourStep>): TourStep => ({
  id,
  kind: "action",
  title: L,
  body: L,
  ...extra,
});

const ctx: TourContext = {
  permissions: ["dashboard:read", "costing:read", "costing:write"],
  modules: { ahu: false },
  isDesktop: true,
};

const welcome: TourDefinition = { key: "welcome", steps: [info("a"), info("b")] };
const costing: TourDefinition = {
  key: "costing",
  route: "/costing",
  permission: "costing:write",
  invite: { title: L, minutes: 3 },
  steps: [
    action("new", { advanceOn: "costing.new-project-dialog-opened" }),
    action("name", { advanceOnRoute: "/costing/" }),
    info("ahu", { when: (c) => c.modules.ahu }),
    info("price"),
  ],
};
const empty: TourDefinition = {
  key: "database",
  route: "/database",
  permission: "db:read",
  invite: { title: L, minutes: 2 },
  steps: [],
};
const settings: TourDefinition = {
  key: "settings",
  route: "/settings",
  permission: "settings:write",
  invite: { title: L, minutes: 2 },
  steps: [info("company")],
};
const tutorials = { welcome, costing, database: empty, settings } as Record<
  TourKey,
  TourDefinition
>;

const idle: TourState = { status: "idle" };
const run = (def: TourDefinition) => tourReducer(idle, { type: "start", def, ctx }).state;

describe("tourReducer", () => {
  it("next advances info steps and the last next saves done", () => {
    let r = tourReducer(run(welcome), { type: "next" });
    expect(r.state).toMatchObject({ status: "running", index: 1 });
    expect(r.effect).toBeNull();
    r = tourReducer(r.state, { type: "next" });
    expect(r.state).toEqual(idle);
    expect(r.effect).toEqual({ save: { key: "welcome", status: "done" } });
  });

  it("next is ignored on action steps", () => {
    const s = run(costing);
    expect(tourReducer(s, { type: "next" }).state).toBe(s);
  });

  it("event advances only the matching action step", () => {
    const s = run(costing);
    expect(tourReducer(s, { type: "event", name: "other" }).state).toBe(s);
    const r = tourReducer(s, { type: "event", name: "costing.new-project-dialog-opened" });
    expect(r.state).toMatchObject({ status: "running", index: 1 });
  });

  it("route advances when pathname starts with advanceOnRoute", () => {
    let s = tourReducer(run(costing), {
      type: "event",
      name: "costing.new-project-dialog-opened",
    }).state;
    expect(tourReducer(s, { type: "route", pathname: "/costing" }).state).toBe(s);
    s = tourReducer(s, { type: "route", pathname: "/costing/p1" }).state;
    expect(s).toMatchObject({ status: "running", index: 2 });
  });

  it("filters steps with when()", () => {
    expect(visibleSteps(costing, ctx).map((s) => s.id)).toEqual(["new", "name", "price"]);
    expect(
      visibleSteps(costing, { ...ctx, modules: { ahu: true } }).map((s) => s.id)
    ).toEqual(["new", "name", "ahu", "price"]);
  });

  it("skip saves skipped from invite and from running", () => {
    const invite = tourReducer(idle, { type: "invite", key: "costing" });
    expect(invite.state).toEqual({ status: "invite", key: "costing" });
    expect(tourReducer(invite.state, { type: "skip" })).toEqual({
      state: idle,
      effect: { save: { key: "costing", status: "skipped" } },
    });
    expect(tourReducer(run(welcome), { type: "skip" })).toEqual({
      state: idle,
      effect: { save: { key: "welcome", status: "skipped" } },
    });
  });

  it("skips a step whose target is missing; missing on the last step saves done", () => {
    let r = tourReducer(run(welcome), { type: "target-missing" });
    expect(r.state).toMatchObject({ status: "running", index: 1 });
    r = tourReducer(r.state, { type: "target-missing" });
    expect(r).toEqual({ state: idle, effect: { save: { key: "welcome", status: "done" } } });
  });

  it("target-missing on route change keeps the tour running at the next step", () => {
    let s = run(costing);
    s = tourReducer(s, { type: "route", pathname: "/database" }).state;
    expect(s).toMatchObject({ status: "running", index: 0 });
    s = tourReducer(s, { type: "target-missing" }).state;
    expect(s).toMatchObject({ status: "running", key: "costing", index: 1 });
  });

  it("start with zero visible steps stays idle and saves nothing", () => {
    expect(tourReducer(idle, { type: "start", def: empty, ctx })).toEqual({
      state: idle,
      effect: null,
    });
  });

  it("invite does not interrupt a running tour", () => {
    const s = run(welcome);
    expect(tourReducer(s, { type: "invite", key: "costing" }).state).toBe(s);
  });
});

describe("pickAutoTour", () => {
  const base = { ctx, forced: null, tutorials };

  it("returns null on excluded routes", () => {
    for (const pathname of ["/activate", "/operator", "/sign-in/x", "/sign-up", "/legal/terms"]) {
      expect(pickAutoTour({ ...base, pathname, progress: {} })).toBeNull();
    }
  });

  it("runs welcome first on any app route", () => {
    expect(pickAutoTour({ ...base, pathname: "/costing", progress: {} })).toEqual({
      kind: "run",
      key: "welcome",
    });
  });

  it("invites an unseen module tour once welcome is done or skipped", () => {
    for (const status of ["done", "skipped"] as const) {
      expect(
        pickAutoTour({ ...base, pathname: "/costing/p1", progress: { welcome: status } })
      ).toEqual({ kind: "invite", key: "costing" });
    }
    expect(
      pickAutoTour({
        ...base,
        pathname: "/costing",
        progress: { welcome: "done", costing: "skipped" },
      })
    ).toBeNull();
  });

  it("ignores a module tour without steps", () => {
    expect(
      pickAutoTour({ ...base, pathname: "/database", progress: { welcome: "done" } })
    ).toBeNull();
  });

  it("ignores a module tour the user lacks permission for", () => {
    expect(
      pickAutoTour({ ...base, pathname: "/settings", progress: { welcome: "done" } })
    ).toBeNull();
  });

  it("forced runs that tour even when progress says done", () => {
    expect(
      pickAutoTour({
        ...base,
        forced: "costing",
        pathname: "/costing",
        progress: { welcome: "done", costing: "done" },
      })
    ).toEqual({ kind: "run", key: "costing" });
  });
});
