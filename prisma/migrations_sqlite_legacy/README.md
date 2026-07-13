# SQLite-era migrations (archived)

These migrations were generated for the original SQLite datasource. They use `DATETIME` and other SQLite-specific SQL and must **not** run against PostgreSQL.

Fresh Postgres deployments (Neon, Docker) use only:

- `prisma/migrations/20260703100000_saas_postgres_baseline/`

Legacy SQLite → Postgres data moves use `scripts/migrate-sqlite-to-postgres.mjs`.
