---
paths:
  - "app/api/**/*.ts"
---

# API routes

- Parse JSON safely; validate before Prisma; client mistakes return `400 { error, detail? }`.
- Log server-side; never leak stacks or paths in 500s (generic message).
- Use `prisma` from `@/lib/prisma`; transactions when multiple writes must be atomic.
- Reject unauthenticated mutations and scope every query by `organizationId` (see `docs/PRODUCTION-HARNESS.md`).
- Bulk/destructive operations follow existing patterns (e.g. `quotations/bulk-delete`).
