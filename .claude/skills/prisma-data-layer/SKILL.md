---
name: prisma-data-layer
description: >-
  Use when editing prisma/schema.prisma, migrations, seed data, or data access patterns
  that affect CostingProject, segments, materials, or quotations.
---

# Prisma & data layer

## Schema changes

1. Edit `prisma/schema.prisma` with clear field names and comments for non-obvious JSON (e.g. `ahuRecalcParams`).
2. Generate client: `pnpm prisma generate` (or `npx prisma generate`).
3. Prefer **`prisma migrate dev`** for tracked migrations in team environments. Avoid `db push --accept-data-loss` for anything that could contain production-like data.

## SQLite vs future hosting

- App currently uses **SQLite** via Prisma. For **production SaaS**, plan a move to a **hosted Postgres** (or similar): update `datasource`, connection pooling, and backups — see `docs/PRODUCTION-HARNESS.md`.

## Access patterns

- Use **`@/lib/prisma`** singleton. Use **transactions** for multi-step writes that must stay consistent (see existing recalculate route).
- When **multi-tenancy** is added, every `findMany` / `findUnique` for tenant-owned rows must filter by `tenantId` / `organizationId` (schema TBD).

## Seed & scripts

- `prisma/seed.ts` is for dev defaults. Do not put production secrets in seed.
