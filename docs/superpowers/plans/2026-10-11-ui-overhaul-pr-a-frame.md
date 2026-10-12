# UI Overhaul PR A: App Frame (menu, Help icon, bottom bar, page title row) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the app a conventional frame on top of the Dot Matrix theme: a 4-item main menu with Help as a right-side icon, bottom navigation on phone/tablet, and one slim title row per page.

**Base:** draft PR #12 (head `46246ad`) already ships the `dotmatrix` palette (light/dark, default), DM Sans + Doto fonts, `components/dot/*`, restyled `card/button/tabs/table`, the COSTING wordmark and the personal dashboard. This plan builds on it: cut the implementation branch from #12's head (`git fetch origin pull/12/head`) or from `master` once #12 is merged, and do not redo any of that work.

**Architecture:** Navigation items come from one pure function shared by the top bar and the bottom bar; Navbar keeps #12's pill style for the active item. No routes, data, or calculation code change.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 tokens, shadcn `components/ui/*`, lucide, Clerk, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-ux-ui-overhaul-design.md` (section 1 and delivery item 1). Plans for the project page, editors and polish are written separately.

## Global Constraints

- UI only: do not edit `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, `prisma/**`, `app/api/**`.
- Principle: conventional patterns, no improvisation. Main menu is exactly **Dashboard, Database, Costing, Dokumentasi**; Help is a `?` icon button (`aria-label` "Bantuan") in the right cluster; phone/tablet below `md` uses a bottom bar with the same 4 items (icon + label) and no hamburger.
- Theme tokens, fonts and card styles come from PR #12; use them, add no new palette or font here.
- Semantic tokens only in components (no hex outside `app/globals.css`); lucide icons; `aria-label` on icon-only buttons; exactly one `<h1>` per page; honor `prefers-reduced-motion`.
- New strings in `lib/i18n/messages.ts` (`id` is source of truth; `en` has every key and identical `{placeholders}`). Indonesian sentence case.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard` before opening the PR. Playwright only against a local DB (see `CLAUDE.md`); screenshots at 1280, 768 and 390 widths, light and dark.
- Change only what this PR needs: no restyling of page bodies beyond what tokens, `CardTitle` and the title row change automatically.

## Review Focus

- A role without `db:read` sees no Database item in either the top bar or the bottom bar; an operator sees the extra Operator item. (Task 1 test)
- 360px wide screen in English locale: bottom bar labels truncate instead of overflowing; no horizontal page scroll. (Task 3 Playwright)
- Page content is never hidden behind the bottom bar (last button/row reachable) and toasts do not sit under it. (Task 3 Playwright)
- No Clerk key (dev mode) and signed-out states still expose Help, Settings, and sign-in on mobile. (Task 2 steps)

---

## File Structure

- Create `lib/nav-items.ts` + `lib/nav-items.test.ts`: main navigation source of truth.
- Modify `components/Navbar.tsx`; create `components/bottom-nav.tsx`; modify `components/app-providers.tsx`, `lib/i18n/messages.ts`.
- Modify `components/page-header.tsx`, `components/page-shell.tsx`.
- Create `tests/ui/navigation.spec.ts`; update affected baselines under `tests/ui/__screenshots__/`.
- Modify `docs/UI-HARNESS.md` (navigation note).

---

### Task 1: Navigation source of truth

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

### Task 2: Top bar, Help icon, bottom bar

**Files:**
- Modify: `components/Navbar.tsx`, `components/app-providers.tsx`
- Create: `components/bottom-nav.tsx`

**Interfaces:**
- Consumes: `getMainNav`, `MainNavItem` (Task 1); `useCostingStore` selectors `role`, `permissions`, `isOperator`; `LanguageSwitcher`.
- Produces: `BottomNav()` (client component, `md:hidden`, `fixed inset-x-0 bottom-0 z-50`, `<nav aria-label={t("nav.bottomLabel")}>`, one `Link` per item with lucide icon + label, active item has `aria-current="page"`, labels `truncate`).

- [ ] **Step 1: Navbar.** Use `getMainNav` for the desktop menu (`hidden md:flex`); remove the hamburger button, the open state, and the collapsible mobile panel. Keep #12's logo and its pill style for the active item (spec's dot indicator is dropped in favor of the approved theme).
- [ ] **Step 2: Right cluster:** `LanguageSwitcher`, a Help icon `Button variant="ghost" size="icon"` with `lucide` `CircleHelp`, wrapped in `Link href="/help"`, `aria-label={t("nav.helpAria")}` and a `Tooltip` with the same text, then `AuthControls`. In the Clerk `UserButton.MenuItems` add a `UserButton.Link` to `/help` (label `nav.help`) so Help stays reachable on phone where the icon is hidden below `sm`; the Help icon itself shows from `sm` up. In dev mode (no Clerk key) keep the "Pengaturan" button and show the Help icon at all widths.
- [ ] **Step 3: `components/bottom-nav.tsx`** as specified in Interfaces; background `bg-card`, top border `border-border`, padding `pb-[env(safe-area-inset-bottom)]`.
- [ ] **Step 4: `components/app-providers.tsx`:** render `<BottomNav />` after `<main>`; `<main>` gets `pb-16 md:pb-0` (bottom bar height) in addition to existing classes. Check `components/Toast.tsx` positioning: on `<md` lift the toaster above the bar (`bottom-20`) if it is bottom-anchored.
- [ ] **Step 5: Verify** `npm run typecheck`, `npm run lint`. With `npm run dev` (local DB, `AUTH_BYPASS=true`), check at 1280: top bar shows 4 items, Help `?` right of language switcher; at 390: bottom bar with 4 items, no hamburger, content scrolls fully clear of the bar, sign-in buttons (signed-out) do not overflow the top bar.
- [ ] **Step 6: Commit** `feat(nav): top bar with help icon and mobile bottom navigation`.

### Task 3: Page title row

**Files:**
- Modify: `components/page-header.tsx`, `components/page-shell.tsx`
- Create: `tests/ui/navigation.spec.ts`

**Interfaces:**
- Produces: `PageHeader` `variant="band"` (the default) renders without the full-width background/border strip: same markup as `inline` with `pt-6 pb-2`; the `variant` prop and all call sites stay valid. `PageShell` content `min-h` becomes `min-h-[calc(100vh-3.5rem)]` unchanged but with `pb-24 md:pb-6` handled by `<main>` (do not double-pad).

- [ ] **Step 1: Write `tests/ui/navigation.spec.ts`** (Playwright, `AUTH_BYPASS=true` like the neighbours): at 1280×800 `/` has link names Dashboard, Database, Costing, Dokumentasi in `nav[aria-label="Navigasi utama"]`, no Help link inside that nav, and a button/link named "Bantuan" navigating to `/help`; at 390×844 the nav `aria-label="Navigasi bawah"` is visible with the same 4 links, no element named "Buka menu"; at 360×740 with locale `en` set via the language switcher, `document.documentElement.scrollWidth <= window.innerWidth`; on `/costing` scroll to bottom and assert the last interactive element's bounding box bottom is above the bottom bar's top.
- [ ] **Step 2: Run** `npm run ui:test -- navigation.spec.ts`. Expected: FAIL before Task 2/3 changes are in place (run it first against Task 2's work to see layout/title assertions fail), then PASS after Step 3.
- [ ] **Step 3: Implement** the `PageHeader` change; confirm each page still has exactly one `<h1>` (`grep -rn "<h1" app components` plus `page-route-skeleton.tsx`).
- [ ] **Step 4: Run** `npm run ui:test -- navigation.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): slim page title row, navigation Playwright spec`.

### Task 4: Baselines, docs, final checks

**Files:**
- Modify: `docs/UI-HARNESS.md`, `tests/ui/__screenshots__/**`

- [ ] **Step 1: Update `docs/UI-HARNESS.md`:** a short "Navigation" note (4 main items, Help icon, bottom bar below `md`).
- [ ] **Step 2: Run** `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard`. Expected: all pass with no new warnings in touched files.
- [ ] **Step 3: Re-baseline** with `npm run ui:test:update` against the local DB; review the diffs in `playwright-report/` (header, bottom bar and title row are the only intended changes) and commit the PNGs.
- [ ] **Step 4: Screenshots** for the PR body: `/`, `/costing`, `/settings` at 1280, 768, 390, light and dark; paste into `docs/UI-PR-CHECKLIST.md` walkthrough in the PR description.
- [ ] **Step 5: Commit** `test(ui): update baselines for dot matrix frame`, open the PR (title "App frame: 4-item menu, Help icon, bottom nav"), follow the repo PR template and attribution rules.
