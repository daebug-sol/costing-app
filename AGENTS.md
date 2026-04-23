# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Agent harness (this repo)

| Resource | Purpose |
|----------|---------|
| `.cursor/rules/*.mdc` | **Rules**: core stack/scope, calculations, API routes, UI — always-on or glob-scoped. |
| `.cursor/skills/*/SKILL.md` | **Skills**: playbooks for formula changes, Prisma/data, exports, production release. |
| `docs/PRODUCTION-HARNESS.md` | **Harness**: SaaS/production checklist (auth, tenancy, DB, CI, ops) — not replaceable by prompts alone. |

When a task touches costing math, use the **costing-formula-change** skill. When deploying or hardening for production, read **PRODUCTION-HARNESS.md** and the **production-release** skill.