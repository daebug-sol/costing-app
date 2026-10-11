# UI Overhaul PR A: Dot Matrix Frame (theme, header, bottom bar, page title row) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Dot Matrix look and a conventional app frame: sticky top bar with Help as a right-side icon, bottom navigation on phone/tablet, one slim title row per page, uniform card headers.

**Architecture:** Dot Matrix becomes a third palette (`data-palette="dotmatrix"`) in the existing token system, default for new users; stored `professional`/`warm` choices keep working. Navigation items come from one pure function shared by the top bar and the bottom bar. No routes, data, or calculation code change.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 tokens in `app/globals.css`, `next/font/google` (DM Sans, Doto), shadcn `components/ui/*`, lucide, Clerk, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-ux-ui-overhaul-design.md` (sections 1, 5, and the delivery list item 1). Plans for PR B (project page), C (editors), D (dashboard), E (polish) are written separately.

## Global Constraints

- UI only: do not edit `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, `prisma/**`, `app/api/**`.
- Principle: conventional patterns, no improvisation. Main menu is exactly **Dashboard, Database, Costing, Dokumentasi**; Help is a `?` icon button (`aria-label` "Bantuan") in the right cluster; phone/tablet below `md` uses a bottom bar with the same 4 items (icon + label) and no hamburger.
- Dots/display font (`Doto`) only for the logo and hero numbers; all other text DM Sans. Card headers: uppercase, DM Sans 700, `letter-spacing: 0.1em`, 12px, with a 6px square marker before the text.
- Semantic tokens only in components (no hex outside `app/globals.css`); lucide icons; `aria-label` on icon-only buttons; exactly one `<h1>` per page; honor `prefers-reduced-motion`.
- New strings in `lib/i18n/messages.ts` (`id` is source of truth; `en` has every key and identical `{placeholders}`). Indonesian sentence case.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard` before opening the PR. Playwright only against a local DB (see `CLAUDE.md`); screenshots at 1280, 768 and 390 widths, light and dark.
- Change only what this PR needs: no restyling of page bodies beyond what tokens, `CardTitle` and the title row change automatically.

## Review Focus

- A user whose `localStorage` holds `palette: "warm"` or `"professional"` keeps that palette after the upgrade; only missing/invalid values fall back to `dotmatrix`. (Task 1 test)
- A role without `db:read` sees no Database item in either the top bar or the bottom bar; an operator sees the extra Operator item. (Task 3 test)
- 360px wide screen in English locale: bottom bar labels truncate instead of overflowing; no horizontal page scroll. (Task 5 Playwright)
- Page content is never hidden behind the bottom bar (last button/row reachable) and toasts do not sit under it. (Task 5 Playwright)
- No Clerk key (dev mode) and signed-out states still expose Help, Settings, and sign-in on mobile. (Task 4 steps)
- If the Doto font fails to load, the logo falls back to monospace without layout jump. (Task 1 step)

---

## File Structure

- Modify `lib/theme-preferences.ts`, `tests/theme-preferences.test.ts`: third palette, new default.
- Modify `app/globals.css`: `dotmatrix` token sets (light + dark), `--font-dot`.
- Modify `app/layout.tsx`: DM Sans as `--font-sans`, Doto as `--font-dot`, `data-palette="dotmatrix"`.
- Modify `components/settings/theme-settings-card.tsx`, `lib/i18n/messages.ts`: third palette choice + nav strings.
- Create `lib/nav-items.ts` + `lib/nav-items.test.ts`: main navigation source of truth.
- Modify `components/Navbar.tsx`; create `components/bottom-nav.tsx`; modify `components/app-providers.tsx`.
- Modify `components/ui/card.tsx` (`CardTitle`), `components/page-header.tsx`, `components/page-shell.tsx`.
- Create `tests/ui/navigation.spec.ts`; update affected baselines under `tests/ui/__screenshots__/`.
- Modify `docs/UI-HARNESS.md` (palettes, navigation).

---

### Task 1: Dot Matrix palette and fonts

**Files:**
- Modify: `lib/theme-preferences.ts`, `tests/theme-preferences.test.ts`, `app/globals.css`, `app/layout.tsx`, `components/settings/theme-settings-card.tsx`, `lib/i18n/messages.ts`, `tests/ui/settings.visual.spec.ts`

**Interfaces:**
- Produces: `ThemePalette = "dotmatrix" | "professional" | "warm"`; `DEFAULT_THEME_PREFERENCES = { palette: "dotmatrix", appearance: "system" }`; CSS variable `--font-dot`; Tailwind utility `font-dot`; message keys `settings.appearance.paletteDotMatrix` (ID "Dot matrix", EN "Dot matrix").

- [ ] **Step 1: Update `tests/theme-preferences.test.ts`.** Change the defaults test to expect `palette: "dotmatrix"`. Add: `parseThemePreferences({ palette: "dotmatrix", appearance: "light" })` returns it unchanged; `parseThemePreferences({ palette: "warm", appearance: "dark" })` still returns `warm` (stored choice survives); `{ palette: "neon" }` falls back to `DEFAULT_THEME_PREFERENCES`.
- [ ] **Step 2: Run** `npx jest tests/theme-preferences.test.ts`. Expected: FAIL on the new default and `dotmatrix`.
- [ ] **Step 3: Implement** in `lib/theme-preferences.ts`: extend `ThemePalette` and `isThemePalette`, set the default palette to `"dotmatrix"`. Check `THEME_INIT_SCRIPT` in the same file validates palette against the same list (add `dotmatrix`) and falls back to `dotmatrix`.
- [ ] **Step 4: Run** the same test. Expected: PASS.
- [ ] **Step 5: Add token sets in `app/globals.css`** for `html[data-palette="dotmatrix"]` (light) and `html.dark[data-palette="dotmatrix"]`, defining every variable the `professional` block defines, using these values (from the approved dashboard sample, which shows hex; converting to oklch is optional):

| Token | Light | Dark |
|---|---|---|
| `--background` | `#d6d4cb` | `#000000` |
| `--card`, `--popover` | `#ffffff` | `#111111` |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `#15151a` | `#ffffff` |
| `--primary` | `#15151a` | `#ffffff` |
| `--primary-foreground` | `#ffffff` | `#000000` |
| `--secondary`, `--muted`, `--accent`, `--surface-nested` | `#f2f1ed` | `#1e1e1e` |
| `--secondary-foreground`, `--accent-foreground` | `#15151a` | `#ffffff` |
| `--muted-foreground` | `#55554f` | `#9b9b9b` |
| `--border`, `--input` | `rgba(21,21,26,.14)` | `rgba(255,255,255,.11)` |
| `--ring` | `#55554f` | `#9b9b9b` |
| `--surface-inset` | `#ecebe4` | `#0c0c0c` |
| `--destructive` | `#c9151e` | `#ff453a` |
| `--success` | `#16803a` | `#30d158` |
| `--success-muted` | `#e4f1e8` | `#0f2a18` |
| `--warning` | `#8a5a00` | `#f5b83d` |
| `--warning-muted` | `#f6ecd6` | `#2a2110` |
| `--chart-1`..`--chart-5` | `#15151a`, `#55554f`, `#16803a`, `#c9151e`, `#c2c0b9` | `#ffffff`, `#9b9b9b`, `#30d158`, `#ff453a`, `#3a3a3a` |
| `--category-N` / `--category-N-muted` (1-6) | `--category-N` = `--chart-1..5` cycling (6 reuses chart-1); `-muted` = `--secondary` | same rule |
| `--radius` | `1rem` | `1rem` |
| `--sidebar*` | same as card/foreground/primary/accent/border equivalents | same rule |

  Also set `html[data-palette="dotmatrix"] body` to the dotted canvas: `background-image: radial-gradient(circle, rgba(21,21,26,.07) 1px, transparent 1.6px); background-size: 16px 16px` (dark: `rgba(255,255,255,.05)`).
- [ ] **Step 6: Fonts in `app/layout.tsx`:** replace `Inter` with `DM_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-sans", display: "swap" })`, add `Doto({ subsets: ["latin"], weight: ["400","900"], variable: "--font-dot", display: "swap" })`, add its variable to the `<html>` className, set `data-palette="dotmatrix"`. In `app/globals.css` `@theme inline` add `--font-dot: var(--font-dot), "DotGothic16", ui-monospace, monospace;` (mirrors how `--font-display` is declared). Leave `displaySerif` and `plexMono` as they are.
- [ ] **Step 7: Settings picker.** In `components/settings/theme-settings-card.tsx` add a third `ToggleGroupItem value="dotmatrix"` (`aria-label` from `settings.appearance.paletteDotMatrix`) and accept it in the `onValueChange` guard; add the key to both locales in `lib/i18n/messages.ts`.
- [ ] **Step 8: Update `tests/ui/settings.visual.spec.ts`** type unions to include `"dotmatrix"` and the default-palette assertion at line ~116 to `"dotmatrix"`.
- [ ] **Step 9: Verify.** `npx jest tests/theme-preferences.test.ts lib/i18n/messages.test.ts` PASS; `npm run typecheck` clean; `npm run build` compiles (fonts are fetched at build; if the sandbox has no network, run this step where it does). Manually check with the font network-blocked that the logo area still renders (fallback monospace).
- [ ] **Step 10: Commit** `feat(theme): add dot matrix palette, DM Sans and Doto fonts`.

### Task 2: Card header style

**Files:**
- Modify: `components/ui/card.tsx` (`CardTitle`)

**Interfaces:**
- Produces: `CardTitle` renders uppercase 12px DM Sans 700, `tracking-[0.1em]`, with a 6px square marker (`before:` pseudo-element, `currentColor`, 8px gap).

- [ ] **Step 1: Implement** the class change in `CardTitle` (replace `text-lg font-semibold tracking-wider uppercase`). The marker is `before:mr-2 before:inline-block before:size-1.5 before:bg-current before:align-[1px] before:content-['']`.
- [ ] **Step 2: Verify** `npm run typecheck`, `npm run lint` clean; screenshot `/settings` light/dark and confirm every card header shows the marker and uppercase text.
- [ ] **Step 3: Commit** `feat(ui): uppercase card headers with square marker`.

### Task 3: Navigation source of truth

**Files:**
- Create: `lib/nav-items.ts`, `lib/nav-items.test.ts`

**Interfaces:**
- Consumes: `canSeeNavHref(href: string, role: OrgRole, permissions: readonly Permission[]): boolean` and types from `lib/permissions.ts`; `MessageKey` from `lib/i18n/messages`.
- Produces: `type MainNavItem = { href: string; labelKey: MessageKey; icon: "dashboard" | "database" | "costing" | "documentation" | "operator" }` and `getMainNav(role: OrgRole, permissions: readonly Permission[], isOperator: boolean): MainNavItem[]`. Order: Dashboard `/`, Database `/database`, Costing `/costing`, Documentation `/documentation`, then Operator `/operator` only when `isOperator`. Help is not included. The Documentation label key `nav.documentation` ID text becomes "Dokumentasi".

- [ ] **Step 1: Write failing tests** in `lib/nav-items.test.ts`: a full-permission role returns exactly `["/", "/database", "/costing", "/documentation"]`; never contains `/help`; a role with no `db:read` omits `/database`; `isOperator=true` appends `/operator` last; `isOperator=false` never includes it.
- [ ] **Step 2: Run** `npx jest lib/nav-items.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `getMainNav` filtering a constant list with `canSeeNavHref`.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Set** `"nav.documentation"` ID value to "Dokumentasi" in `lib/i18n/messages.ts`; add keys `nav.helpAria` (ID "Bantuan", EN "Help") and `nav.bottomLabel` (ID "Navigasi bawah", EN "Bottom navigation").
- [ ] **Step 6: Commit** `feat(nav): shared main navigation list`.

### Task 4: Top bar, Help icon, bottom bar

**Files:**
- Modify: `components/Navbar.tsx`, `components/app-providers.tsx`
- Create: `components/bottom-nav.tsx`

**Interfaces:**
- Consumes: `getMainNav`, `MainNavItem` (Task 3); `useCostingStore` selectors `role`, `permissions`, `isOperator`; `LanguageSwitcher`; `Dot`-free logo text.
- Produces: `BottomNav()` (client component, `md:hidden`, `fixed inset-x-0 bottom-0 z-50`, `<nav aria-label={t("nav.bottomLabel")}>`, one `Link` per item with lucide icon + label, active item has `aria-current="page"`, labels `truncate`).

- [ ] **Step 1: Navbar.** Use `getMainNav` for the desktop menu (`hidden md:flex`); remove the hamburger button, the open state, and the collapsible mobile panel. Logo: `<Link href="/">` showing "costing" in `font-dot uppercase text-2xl` (Doto 900). Active item: `text-foreground font-semibold` with a 6px dot before the label (`before:` pseudo-element); inactive `text-muted-foreground hover:text-foreground`. No filled pill.
- [ ] **Step 2: Right cluster:** `LanguageSwitcher`, a Help icon `Button variant="ghost" size="icon"` with `lucide` `CircleHelp`, wrapped in `Link href="/help"`, `aria-label={t("nav.helpAria")}` and a `Tooltip` with the same text, then `AuthControls`. In the Clerk `UserButton.MenuItems` add a `UserButton.Link` to `/help` (label `nav.help`) so Help stays reachable on phone where the icon is hidden below `sm`; the Help icon itself shows from `sm` up. In dev mode (no Clerk key) keep the "Pengaturan" button and show the Help icon at all widths.
- [ ] **Step 3: `components/bottom-nav.tsx`** as specified in Interfaces; background `bg-card`, top border `border-border`, padding `pb-[env(safe-area-inset-bottom)]`.
- [ ] **Step 4: `components/app-providers.tsx`:** render `<BottomNav />` after `<main>`; `<main>` gets `pb-16 md:pb-0` (bottom bar height) in addition to existing classes. Check `components/Toast.tsx` positioning: on `<md` lift the toaster above the bar (`bottom-20`) if it is bottom-anchored.
- [ ] **Step 5: Verify** `npm run typecheck`, `npm run lint`. With `npm run dev` (local DB, `AUTH_BYPASS=true`), check at 1280: top bar shows 4 items, Help `?` right of language switcher; at 390: bottom bar with 4 items, no hamburger, content scrolls fully clear of the bar, sign-in buttons (signed-out) do not overflow the top bar.
- [ ] **Step 6: Commit** `feat(nav): top bar with help icon and mobile bottom navigation`.

### Task 5: Page title row

**Files:**
- Modify: `components/page-header.tsx`, `components/page-shell.tsx`
- Create: `tests/ui/navigation.spec.ts`

**Interfaces:**
- Produces: `PageHeader` `variant="band"` (the default) renders without the full-width background/border strip: same markup as `inline` with `pt-6 pb-2`; the `variant` prop and all call sites stay valid. `PageShell` content `min-h` becomes `min-h-[calc(100vh-3.5rem)]` unchanged but with `pb-24 md:pb-6` handled by `<main>` (do not double-pad).

- [ ] **Step 1: Write `tests/ui/navigation.spec.ts`** (Playwright, `AUTH_BYPASS=true` like the neighbours): at 1280×800 `/` has link names Dashboard, Database, Costing, Dokumentasi in `nav[aria-label="Navigasi utama"]`, no Help link inside that nav, and a button/link named "Bantuan" navigating to `/help`; at 390×844 the nav `aria-label="Navigasi bawah"` is visible with the same 4 links, no element named "Buka menu"; at 360×740 with locale `en` set via the language switcher, `document.documentElement.scrollWidth <= window.innerWidth`; on `/costing` scroll to bottom and assert the last interactive element's bounding box bottom is above the bottom bar's top.
- [ ] **Step 2: Run** `npm run ui:test -- navigation.spec.ts`. Expected: FAIL before Task 4/5 changes are in place (run it first against Task 4's work to see layout/title assertions fail), then PASS after Step 3.
- [ ] **Step 3: Implement** the `PageHeader` change; confirm each page still has exactly one `<h1>` (`grep -rn "<h1" app components` plus `page-route-skeleton.tsx`).
- [ ] **Step 4: Run** `npm run ui:test -- navigation.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): slim page title row, navigation Playwright spec`.

### Task 6: Baselines, docs, final checks

**Files:**
- Modify: `docs/UI-HARNESS.md`, `tests/ui/__screenshots__/**`

- [ ] **Step 1: Update `docs/UI-HARNESS.md`:** section 1 palettes (add Dot matrix, new default, `data-palette`, fonts), a short "Navigation" note (4 main items, Help icon, bottom bar below `md`).
- [ ] **Step 2: Run** `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard`. Expected: all pass with no new warnings in touched files.
- [ ] **Step 3: Re-baseline** with `npm run ui:test:update` against the local DB; review the diffs in `playwright-report/` (header, card titles, palette colors are the only intended changes) and commit the PNGs.
- [ ] **Step 4: Screenshots** for the PR body: `/`, `/costing`, `/settings` at 1280, 768, 390, light and dark; paste into `docs/UI-PR-CHECKLIST.md` walkthrough in the PR description.
- [ ] **Step 5: Commit** `test(ui): update baselines for dot matrix frame`, open the PR (title "Dot matrix frame: theme, header, bottom nav"), follow the repo PR template and attribution rules.
