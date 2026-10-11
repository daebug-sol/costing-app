# Dot Matrix theme, PR 1: theme foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `dotmatrix` palette as the default, with new fonts and re-skinned base components, so every existing screen changes look through tokens alone.

**Architecture:** A third palette block in `app/globals.css` remaps the existing shadcn variables (plus a few new tokens), selected through the existing `data-palette` attribute and `html.dark`. `lib/theme-preferences.ts` learns the new palette. `components/ui/*` and the Navbar get small class changes. No data, API or calculation changes.

**Tech Stack:** Next.js 16, Tailwind 4 (`@theme inline`), `next/font/google`, jest, Playwright visual tests.

**Spec:** `docs/superpowers/specs/2026-10-11-dot-matrix-theme-design.md` (this plan covers delivery item 1 only). Reference sample: https://claude.ai/artifact/1EiQs7d9y6Xm5Aokk1qhuk

## Global Constraints

- Palette name `dotmatrix`; default for new users; stored `professional` and `warm` choices keep working.
- Fonts: DM Sans (400, 500, 600, 700) for text, Doto (400, 900) for dot numbers. Plex Mono stays.
- Radius scale 8 / 16 / 24 px; no shadows, gradients or blur; hairline ring on cards in light mode.
- Colors only through tokens (oklch in `globals.css`); signal = red, positive = green; no hex in components.
- Card titles stay uppercase (already `uppercase tracking-wider` in `CardTitle`); `UI-COPY-GUIDE.md` §2 documents the exception.
- Never touch `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`.
- Light mode: page canvas visibly darker than cards; dark mode: true-black canvas, `#111`-level cards, feature card lighter than standard cards.

## Review Focus

- Stored preference `{palette:"professional"}` or `"warm"` must still apply after the upgrade (not be overwritten by the new default).
- Corrupt or unknown stored palette falls back to `dotmatrix`, never to an unstyled page.
- First paint: boot script sets `data-palette` before hydration so there is no flash of the old palette.
- Contrast: body text, muted text and signal/positive on card and canvas meet 4.5:1 in light and dark (checked with a small script, see Task 2).
- Dense screens (Costing editor, Database tables, Documentation form) stay usable at the new radius and fonts: no clipped numbers, no wrapped table headers.

---

### Task 1: Palette preference supports `dotmatrix`

**Files:**
- Modify: `lib/theme-preferences.ts`
- Test: `tests/theme-preferences.test.ts`

**Interfaces:**
- Produces: `type ThemePalette = "dotmatrix" | "professional" | "warm"`; `DEFAULT_THEME_PREFERENCES.palette === "dotmatrix"`; `isThemePalette` accepts all three; `THEME_INIT_SCRIPT` sets `data-palette` to the stored valid palette, else `dotmatrix`.

- [ ] **Step 1: Update tests.** Change the default test to expect `palette: "dotmatrix"`. Add: `parseThemePreferences({palette:"professional",appearance:"dark"})` returns professional; `parseThemePreferences({palette:"neon"})` returns `dotmatrix`; `THEME_INIT_SCRIPT` evaluated with `localStorage` stubbed to `{"palette":"warm"}` sets `data-palette="warm"`, with `{"palette":"professional"}` sets professional, with nothing or invalid JSON sets `dotmatrix` (run the string with `new Function` against a jsdom-style stub document).
- [ ] **Step 2: Run** `npx jest tests/theme-preferences.test.ts`. Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement** the type, default, `isThemePalette`, and rewrite the boot script so the palette is read with a whitelist of the three names and the catch branch sets `dotmatrix`. Keep the appearance logic unchanged.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(theme): add dotmatrix palette preference`.

### Task 2: `dotmatrix` token set in `globals.css`

**Files:**
- Modify: `app/globals.css`
- Create: `scripts/check-theme-contrast.mjs`

**Interfaces:**
- Consumes: Task 1 attribute value `data-palette="dotmatrix"`.
- Produces: all existing semantic variables defined for `html[data-palette="dotmatrix"]` (light) and `html.dark[data-palette="dotmatrix"]` (dark); new variables `--signal`, `--signal-muted`, `--positive`, `--positive-muted`, `--canvas-grid`, `--inverse`, `--inverse-foreground`, `--inverse-muted`; `@theme inline` entries `--color-signal`, `--color-positive`, `--color-inverse`, `--color-inverse-foreground`, `--color-inverse-muted` (plus the `-muted` variants).

- [ ] **Step 1: Write `scripts/check-theme-contrast.mjs`:** parses the `dotmatrix` light and dark blocks of `globals.css`, converts oklch to sRGB, and exits 1 when any of these pairs is under 4.5:1: foreground/background, foreground/card, muted-foreground/card, muted-foreground/background, signal/card, positive/card, primary-foreground/primary, inverse-foreground/inverse.
- [ ] **Step 2: Run** `node scripts/check-theme-contrast.mjs`. Expected: FAIL (blocks do not exist yet).
- [ ] **Step 3: Add the two blocks** with values converted to oklch from the sample (`index.html` `:root` and dark overrides): light canvas `#d6d4cb` (= `--background`), card `#ffffff`, raised `#f2f1ed` (= `--surface-nested`), quiet `#ecebe4` (= `--surface-inset`), ink `#15151a`, muted `#55554f`, off/track `#e2e0da` (= `--border`, `--input`, `--muted`), signal `#c9151e` (= `--destructive`), positive `#16803a` (= `--success`), inverse `#15151a`; dark canvas `#000`, card `#111`, raised `#1e1e1e`, ink `#fff`, muted `#9b9b9b`, border `#2a2a2a`, signal `#ff453a`, positive `#30d158`, inverse `#262626`. `--primary` = ink with `--primary-foreground` = canvas contrast color. `--radius: 1rem`. Chart and category variables reuse the professional hues but desaturated, with signal and positive as `--chart-4` and `--chart-2`. Add the `@theme inline` mappings listed above.
- [ ] **Step 4: Run** the contrast script. Expected: PASS (adjust lightness, not the intent, until it does).
- [ ] **Step 5: Commit** `feat(theme): add dotmatrix tokens`.

### Task 3: Fonts

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Produces: CSS variables `--font-sans` (DM Sans), `--font-dot` (Doto), Tailwind utilities `font-sans`, `font-dot`; `--font-display` kept pointing at `--font-dot` so existing `font-display` users keep compiling.

- [ ] **Step 1: In `layout.tsx`** replace `Inter` with `DM_Sans` (weights 400, 500, 600, 700, `variable: "--font-sans"`) and `Cormorant_Garamond` with `Doto` (weights 400, 900, `variable: "--font-dot"`, fallback monospace); keep Plex Mono; update the `className` list.
- [ ] **Step 2: In `globals.css`** map `--font-dot` in `@theme inline` and point `--font-display` at it. Under `html[data-palette="professional"]` and `warm` restore the previous font look is not required (fonts are global).
- [ ] **Step 3: Run** `grep -rn "font-display" app components` and confirm each use still reads acceptably as a dot font (list them in the PR description; fix any that are body-length text by switching to `font-sans`).
- [ ] **Step 4: Run** `npm run typecheck && npm run build`. Expected: success, fonts self-hosted by `next/font`.
- [ ] **Step 5: Commit** `feat(theme): DM Sans and Doto fonts`.

### Task 4: Palette picker and copy

**Files:**
- Modify: `components/settings/theme-settings-card.tsx`, `components/theme-provider.tsx`, `lib/i18n/messages.ts`
- Test: `lib/i18n/messages.test.ts` (existing parity test)

**Interfaces:**
- Consumes: `ThemePalette` from Task 1.
- Produces: message keys `settings.appearance.paletteDotmatrix` (id "Dot Matrix", en "Dot Matrix").

- [ ] **Step 1: Add the key** in both locales; the parity test must fail first if only one is added (run it to confirm, then add both).
- [ ] **Step 2: Add a third `ToggleGroupItem`** (first in order) and widen the `onValueChange` guard to use `isThemePalette`. Confirm `theme-provider.tsx` needs no logic change beyond types.
- [ ] **Step 3: Run** `npx jest tests lib/i18n && npm run typecheck`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(settings): dotmatrix palette option`.

### Task 5: Base components and navigation

**Files:**
- Modify: `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/input.tsx`, `components/Navbar.tsx`, `components/page-shell.tsx`, `components/page-header.tsx`

**Interfaces:**
- Produces: `Card` accepts `tone?: "standard" | "quiet" | "feature"` (default `standard`) via `data-tone`; styles: standard = `bg-card ring-1 ring-border rounded-2xl`, quiet = `bg-surface-inset`, feature = `bg-inverse text-inverse-foreground`; no `shadow-sm`. Consumers that pass nothing are unchanged apart from the new look.

- [ ] **Step 1: Card:** apply the tone variants, `rounded-2xl`, remove `shadow-sm`, add a small square marker before `CardTitle` (`before:` pseudo-element in `bg-current`, 6px, `mr-2`), keep uppercase and tracking.
- [ ] **Step 2: Button, Badge, Input, Tabs, Table:** pill-shaped primary and tab triggers (`rounded-full`), 8px radius inputs, table header row on `bg-surface-inset` with uppercase 12px muted labels, rows with a hairline divider; badges use `signal` and `positive` tones for danger and success. Keep every existing variant name and prop.
- [ ] **Step 3: Navbar and shell:** brand wordmark in `font-dot` uppercase; active link is an ink pill (`bg-primary text-primary-foreground`); page background carries the faint dot grid via `bg-[radial-gradient(...)]` is forbidden by the no-gradient rule, so draw it with an SVG data-URI `background-image` defined once as `.bg-dot-grid` in `globals.css` using `--canvas-grid`.
- [ ] **Step 4: Run** `npm run lint && npm run typecheck && npm test && npm run ui:standard`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(ui): dotmatrix base components and navigation`.

### Task 6: Docs, visuals, PR

**Files:**
- Modify: `docs/UI-HARNESS.md`, `docs/UI-COPY-GUIDE.md`, `tests/ui/__screenshots__/**`

- [ ] **Step 1: Docs.** `UI-HARNESS.md` §1: document the dotmatrix tokens, signal/positive, card tones, fonts. `UI-COPY-GUIDE.md` §2: card titles are uppercase by design; other copy stays sentence case.
- [ ] **Step 2: Local DB and visuals.** Follow CLAUDE.md (`db:up`, migrate, seed, local `DATABASE_URL`, `TEST_ORG_ID=test-org`), run `npm run ui:test` to see the intended diffs, review them, then `npm run ui:test:update`.
- [ ] **Step 3: Screenshots** of Dashboard, Costing, Database, Documentation, Settings, Help at desktop and mobile in light and dark; read each for clipped numbers, wrapped headers, low contrast; fix in the owning component and re-run.
- [ ] **Step 4: Open a draft PR** to `master` titled "Dot Matrix theme: foundation", description in the required Before/After/How shape, then subscribe to its activity.
- [ ] **Step 5: Commit** `docs: document dotmatrix theme`.
