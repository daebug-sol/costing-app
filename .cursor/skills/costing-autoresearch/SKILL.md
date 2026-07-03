---
name: costing-autoresearch
description: Run autoresearch loops on costing-app UI/product goals with harness gates. Use when iterating UI fast, resuming autoresearch.jsonl, or pairing /autoresearch with MCP tools.
---

# Costing-app autoresearch

## When to use

- UI/UX iteration on `app/**`, `components/**` with measurable gates.
- Resuming when `autoresearch.jsonl` exists — read `autoresearch.md` first.
- User asks for faster iterative development toward harness / UX goals.

## Do not use for

- Formula/calculation changes → **costing-formula-change**
- Production hardening only → **production-release** + `docs/PRODUCTION-HARNESS.md`

## Loop (pick one driver)

### A — MCP (measurable, dashboard-friendly)

1. Read `autoresearch.md` and `docs/UI-HARNESS.md` if UI touched.
2. `init_experiment` — metric `gates_pass`, direction **higher**.
3. `run_experiment` → baseline → `log_experiment`.
4. One focused change → `run_experiment` → `autoresearch.checks.sh` if keeping → `log_experiment` with full `asi` keys.
5. Update **What's Been Tried** in `autoresearch.md`.

### B — Slash command (goal-directed)

```
/autoresearch-plan
Goal: <plain language, e.g. apply shadcn dashboard template to / without breaking UX scenarios>
```

Then `/autoresearch` with `Iterations: N` or unbounded until interrupt.

## Quality bar (same as normal PR)

- `npm test`, `npm run lint` green before **keep**.
- For visual routes: `npm run ui:test` before merge (can run outside tight loop if slow).
- Walk touched scenarios in `docs/UX-ACCEPTANCE-SCENARIOS.md`.

## Branch naming

`autoresearch/<short-goal>-<YYYYMMDD>`
