---
name: production-release
description: >-
  Use before deploying to staging/production, cutting a release, or hardening the app
  for SaaS (env, CI, smoke tests, rollback). Pair with docs/PRODUCTION-HARNESS.md.
---

# Production & release checklist

## Preconditions

- Read **`docs/PRODUCTION-HARNESS.md`** for the full harness (auth, tenancy, DB, ops).

## Before deploy

1. **Build**: `pnpm build` (or `npm run build`) succeeds; Prisma generate runs in postinstall/build as configured.
2. **Lint / test**: `pnpm lint`, `pnpm test` — fix failures or document waivers.
3. **Env**: Required variables documented; no secrets in repo; production values only in host secrets store.
4. **Migrations**: Applied in correct order on target DB; backup taken before destructive changes.

## Smoke tests (manual)

- Open dashboard, database (materials/components), costing (create project, AHU segment, recalculate), documentation/quotation path if used.
- Confirm no 500s on critical API routes.

## After deploy

- Verify health/version if applicable; monitor error logs for first hour.

## SaaS gaps (track explicitly)

Until implemented, document: **authentication**, **tenant isolation**, **hosted database backups**, **rate limiting**, **observability** (Sentry/logging). Releases are “production-like,” not full SaaS, until these are done.
