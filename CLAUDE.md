# Costing app

Next.js 16 / React 19 / Tailwind 4 / Prisma 7 / Clerk. Indonesian-primary UI with ID/EN switcher (`lib/i18n/`).

**Next.js here differs from public docs.** Before touching Route Handlers, `next.config`, or App Router APIs, read the matching guide in `node_modules/next/dist/docs/01-app/`. Heed deprecations.

## Commands
- `npm run lint` · `npm run typecheck` · `npm test` (jest) · `npm run build`
- `npm run ui:test` (Playwright visual, port 3100, `AUTH_BYPASS=true`); `ui:test:update` only for intended visual changes
- Local dev: `npm run dev` (needs Postgres: `npm run db:up`, `db:migrate`, `db:seed`)

## Hard rules
- Costing math lives only in `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`. UI tasks never change it (a hook blocks edits; set `ALLOW_CALC_EDIT=1` for deliberate formula work, then use the `costing-formula-change` skill).
- Never commit or read `.env*`. Every data access must be tenant-scoped (`organizationId`); see `docs/PRODUCTION-HARNESS.md`.
- Change only what the task requires; no drive-by restyling.

## UI work
Read `docs/UI-HARNESS.md` first; walk `docs/UI-PR-CHECKLIST.md` before finishing. Use `components/ui/*` (shadcn skill for adding), semantic tokens only (no hex), lucide icons, Indonesian copy per `docs/UI-COPY-GUIDE.md`, `AlertDialog` not `window.confirm`, `aria-label` on icon-only buttons. Path-scoped rules are in `.claude/rules/`.

## Verify before saying done
Run lint + typecheck + test; for UI, screenshot the route (desktop and mobile) and show it. Stop hook enforces typecheck + lint.

Windows: PowerShell is primary; git worktree scripts are in `scripts/*.ps1` (`docs/GIT-WORKTREES.md`).
