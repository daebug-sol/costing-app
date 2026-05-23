# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Agent harness (this repo)

| Resource | Purpose |
|----------|---------|
| `.cursor/rules/*.mdc` | **Rules**: core stack/scope, calculations, API routes, UI — always-on or glob-scoped. |
| `.cursor/skills/*/SKILL.md` | **Skills**: playbooks for formula changes, Prisma/data, exports, production release; **skill-ringkas** untuk ringkasan hasil (ID) — lampirkan saat perlu, hemat token (tanpa rule always-on). |
| `docs/PRODUCTION-HARNESS.md` | **Harness**: SaaS/production checklist (auth, tenancy, DB, CI, ops) — not replaceable by prompts alone. |
| `docs/UI-HARNESS.md` | **Harness**: UI/UX standards, interaction & a11y policy, visual regression — gates a UI PR must clear. Linked siblings: `UI-PR-CHECKLIST.md`, `UX-ACCEPTANCE-SCENARIOS.md`, `UI-COPY-GUIDE.md`. |
| `docs/GIT-WORKTREES.md` | **Worktrees**: branch per feature in a separate folder; open that folder in Cursor to shrink context. Scripts: `scripts/new-worktree.ps1`, `remove-worktree.ps1`. |
| Obsidian `Projects/costing-app/` | **Progress hub** (dae-vault): `activity-log.md` auto via Cursor hooks; append `notes.md` after tasks using **obsidian-project-notes** skill. |

When a task touches costing math, use the **costing-formula-change** skill. When deploying or hardening for production, read **PRODUCTION-HARNESS.md** and the **production-release** skill. When a task touches UI/UX (any change under `app/**/*.tsx` or `components/**/*.tsx`), read **UI-HARNESS.md** and walk **UI-PR-CHECKLIST.md** before merge. After completing a non-trivial task, append progress to Obsidian `Projects/costing-app/notes.md` (see **obsidian-project-notes** skill).