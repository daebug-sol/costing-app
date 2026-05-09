# `tests/ui` — Playwright visual & smoke harness

These specs guard the **UI shell** of `costing-app`. They are intentionally
narrow: a baseline per major route + assertions on the headings/labels that
make up each route's contract.

For the full standards, see [`docs/UI-HARNESS.md`](../../docs/UI-HARNESS.md).

## Run

```bash
# one-off, per machine
npx playwright install chromium

# day-to-day
npm run ui:test            # all specs
npm run ui:test:headed     # debug with a visible browser
npm run ui:test:update     # re-baseline (after intentional UI change)
npm run ui:test:report     # open the HTML report from the last run
```

The config (`playwright.config.ts`) starts `next dev` on port **3100** locally
so it won't fight your editor's `next dev` on 3000. In CI it runs against a
production server (`next build && next start`) for more deterministic
snapshots. Override with
`PLAYWRIGHT_PORT` or `PLAYWRIGHT_BASE_URL` if needed.

## Layout

```
tests/ui/
  README.md                  <- this file
  dashboard.visual.spec.ts   <- "/" — see UX scenario 1
  __screenshots__/           <- committed PNG baselines (created on first run)
```

## Authoring

- One spec file per task / route. Name as `<flow>.visual.spec.ts`.
- Wait for a domain signal (a known heading) before snapshotting; do not
  rely on `networkidle` alone.
- Mask data-driven regions (`.tabular-money`, `svg` charts, timestamps) so
  the baseline survives different dev-DB seeds.
- Prefer role/text selectors over CSS classnames. If an element needs a
  stable hook, add `data-testid` in the source rather than coupling to
  Tailwind classes.
- Keep viewport/locale overrides in the config, not the spec.

## Re-baselining

When an intentional UI change makes a baseline fail:

1. Run `npm run ui:test` once to see the diffs in `playwright-report/`.
2. Confirm each diff is the change you meant to ship.
3. Run `npm run ui:test:update` to overwrite the PNGs.
4. Commit the updated PNGs **in the same PR** and call them out in the PR
   description (see `docs/UI-PR-CHECKLIST.md`).

## What this harness does NOT cover

- Calculation correctness — that's `npm test` (Jest) on `lib/calculations/*`.
- Export determinism — covered by the `costing-exports` skill.
- Cross-browser nits outside Chromium — current projects are desktop + iPhone
  Chromium/WebKit emulation only.
