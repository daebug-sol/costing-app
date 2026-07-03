# Autoresearch: costing-app UI & harness iteration

## Objective

Iterate the costing-app **UI and product flows** faster while respecting repo harness rules. Each loop makes **one focused change** (component, layout, copy, or interaction), verifies mechanically, and keeps only improvements.

Success means moving toward:

- **Process**: `docs/UI-HARNESS.md`, `docs/UX-ACCEPTANCE-SCENARIOS.md`, `docs/UI-PR-CHECKLIST.md` gates satisfied for touched routes.
- **Output**: green `npm test` + `npm run lint`; UI regressions caught before merge; shadcn/ui patterns from `.cursor/skills/shadcn/` — no parallel design system.

## Metrics

- **Primary**: `gates_pass` (0 or 1, higher is better) — 1 only when unit tests and lint both pass in `autoresearch.sh`.
- **Secondary**: `jest_seconds` (seconds, lower is better), `test_count` (count, higher is better), `lint_errors` (count, lower is better).

## How to Run

`./autoresearch.sh` — prints `METRIC` lines to stdout. Optional correctness backpressure: `./autoresearch.checks.sh` (full test + lint; use before `log_experiment` with status `keep`).

## Files in Scope

| Area | Paths | Notes |
|------|-------|-------|
| UI routes | `app/**/*.tsx` | Pages, layouts, route-level UI |
| Components | `components/**/*.tsx` | Feature + shared UI (prefer `components/ui/*` primitives) |
| Styles | `app/globals.css`, `*.css` in app/components | Tokens only; no raw hex unless in globals |
| Copy/docs | `docs/UI-COPY-GUIDE.md` | When copy changes ship with UI |

## Off Limits

- `lib/calculations/**`, `lib/ahu/**`, formula extraction scripts — use **costing-formula-change** skill instead; do not tune via autoresearch loop.
- `prisma/schema.prisma`, migrations, `app/api/**` — unless the iteration explicitly includes API work approved by user.
- Deleting or weakening existing Jest golden / calculation tests to “pass” gates.

## Constraints

1. **One change per iteration** — atomic UI/UX commits.
2. **Read harness first** for any UI touch: `docs/UI-HARNESS.md`, relevant UX scenario in `docs/UX-ACCEPTANCE-SCENARIOS.md`.
3. **Indonesian copy** for user-facing strings (`docs/UI-COPY-GUIDE.md`).
4. **Checks must pass** before `log_experiment` status `keep` — run `autoresearch.checks.sh` or equivalent.
5. **Simplicity wins** — same gates_pass with less code → prefer keep.
6. Update this file’s **What’s Been Tried** after every logged experiment.

## What’s Been Tried

_(empty — baseline not logged yet)_

## Resume commands

- **MCP loop**: `init_experiment` → `run_experiment` → `log_experiment` (see `.cursor/skills/autoresearch-create/SKILL.md`).
- **Goal wizard**: `/autoresearch-plan` in Cursor chat.
- **Bounded run**: `/autoresearch` with inline config, e.g. `Iterations: 10` and a concrete goal in the prompt.
