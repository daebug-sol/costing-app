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

## Cursor Cloud specific instructions

### Tech stack summary

Single-process Next.js 16.2.0 app (Turbopack dev, App Router) with embedded SQLite via Prisma + `better-sqlite3`. No external services required.

### Running the dev server

```bash
DATABASE_URL="file:./dev.db" npm run dev
```

Server starts on `http://localhost:3000`. The `DATABASE_URL` env var must point to the SQLite file relative to `prisma/` (default: `file:./dev.db`).

### Database setup (one-time after fresh clone)

```bash
npx prisma db push          # apply schema to SQLite
npx prisma db seed          # seed materials, profiles, components, settings
```

The `prisma migrate reset --force` command requires `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes` when run by an AI agent (Prisma safety guard). This is safe for the local `dev.db` file.

### Key commands

| Action | Command |
|--------|---------|
| Lint | `npm run lint` |
| Unit tests | `npm test` (Jest, 62 tests) |
| UI tests | `npm run ui:test` (Playwright — requires `npx playwright install --with-deps chromium` first) |
| Build | `npm run build` |

### Gotchas

- The `postinstall` script runs `prisma generate` automatically on `npm install`.
- Prisma schema includes models not fully covered by existing migrations (drift). Use `npx prisma db push` rather than `npx prisma migrate dev` for a clean sync in dev.
- ESLint has 3 pre-existing errors and 17 warnings in the codebase — these are not regressions.
- No `.env` file is committed; set `DATABASE_URL` in the shell or provide a `.env` file with `DATABASE_URL=file:./dev.db`.