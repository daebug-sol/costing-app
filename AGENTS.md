# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Agent harness (this repo)

| Resource | Purpose |
|----------|---------|
| `.cursor/rules/*.mdc` | **Rules**: core stack/scope, calculations, API routes, UI — always-on or glob-scoped. |
| `.cursor/skills/*/SKILL.md` | **Skills**: playbooks for formula changes, Prisma/data, exports, production release. |
| `docs/PRODUCTION-HARNESS.md` | **Harness**: SaaS/production checklist (auth, tenancy, DB, CI, ops) — not replaceable by prompts alone. |
| `docs/UI-HARNESS.md` | **Harness**: UI/UX standards, interaction & a11y policy, visual regression — gates a UI PR must clear. Linked siblings: `UI-PR-CHECKLIST.md`, `UX-ACCEPTANCE-SCENARIOS.md`, `UI-COPY-GUIDE.md`. |
| `docs/GIT-WORKTREES.md` | **Worktrees**: branch per feature in a separate folder; open that folder in Cursor to shrink context. Scripts: `scripts/new-worktree.ps1`, `remove-worktree.ps1`. |

When a task touches costing math, use the **costing-formula-change** skill. When deploying or hardening for production, read **PRODUCTION-HARNESS.md** and the **production-release** skill. When a task touches UI/UX (any change under `app/**/*.tsx` or `components/**/*.tsx`), read **UI-HARNESS.md** and walk **UI-PR-CHECKLIST.md** before merge.

## Cursor Cloud

Repo-level cloud agents use `.cursor/environment.json`: on VM startup they run `npm ci` (which executes `postinstall` → `prisma generate`), then `npx playwright install-deps chromium`, `npx playwright install chromium`, and an explicit `npx prisma generate` so the Prisma client is always present for Next.js and scripts. The base image is `.cursor/Dockerfile` (Node 22 Bookworm + native build tools + Playwright Chromium OS libraries). Quick checks: `npx playwright test --list`, `npm run lint`, `npm test`.
