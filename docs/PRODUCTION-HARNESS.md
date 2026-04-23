# Production & SaaS harness — costing-app

This document is the **operational and product harness** for taking **costing-app** from a single-tenant dev app toward **hosted, production-ready SaaS**. It complements **Cursor rules** (`.cursor/rules/`) and **agent skills** (`.cursor/skills/`), which guide *how code is written* — not *infrastructure*.

---

## 1. What “harness” means here

| Layer | Role |
|--------|------|
| **`.cursor/rules/`** | Always-on and path-scoped constraints (stack, API, UI, calculations). |
| **`.cursor/skills/`** | Task playbooks (formula changes, Prisma, release checklist). |
| **This file** | Environments, security, tenancy, database, CI/CD, monitoring — **must be implemented in the product**, not only in prompts. |

---

## 2. Current baseline (typical gaps for SaaS)

Verify in code and deployment; update this section as you ship features.

| Area | Target state for SaaS |
|------|------------------------|
| **Auth** | Real user accounts (email/OAuth/SSO); sessions; password or IdP policies. |
| **Multi-tenancy** | `tenantId` / `organizationId` on tenant-owned models; **every** query scoped; no cross-tenant leakage in APIs. |
| **Database** | Hosted Postgres (or equivalent) with backups, PITR if required; migrations in CI. SQLite is usually **not** the long-term multi-tenant store. |
| **Secrets** | Only in environment / vault on the host; rotateable; never in git. |
| **API security** | HTTPS; CSRF strategy if cookie sessions; rate limits on auth and expensive routes; validate all inputs. |
| **Observability** | Structured logs; error tracking (e.g. Sentry); optional metrics (latency, errors). |
| **CI** | Lint, typecheck, test, build on every PR; block merge on failure. |
| **Legal / privacy** | Privacy policy, terms; data retention; export/delete if serving EU/UK users (GDPR-style). |

---

## 3. Environments

| Env | Purpose |
|-----|---------|
| **Local** | Developer machines; local SQLite or dev DB. |
| **Staging** | Pre-prod parity with production config; safe for demos and QA. |
| **Production** | Customer data; strict access; backups and monitoring. |

Document **required env vars** in a template (e.g. `.env.example`) without real secrets.

---

## 4. Release process (short)

1. Merge to main via PR with green CI.
2. Run DB migrations on target environment (backup first).
3. Deploy application (platform-specific: Vercel, Docker, etc.).
4. Run **smoke tests** (see skill `production-release`).
5. Watch logs and error dashboard for regressions.

**Rollback:** Keep previous deployment artifact and migration downgrade plan when possible.

---

## 5. Costing-specific production notes

- **Financial correctness**: Critical paths are `lib/calculations/*`, recalculate API, `rollupProjectFinancials`. Prefer tests on pure functions; manual smoke after formula changes.
- **Exports**: PDF/Excel generators under `lib/generators/` — regression-test representative quotations after template changes.
- **Excel parity**: If business relies on Excel workbooks, maintain a **formula dump or golden tests** so drift is detectable.

---

## 6. Incident response (minimal)

- **On-call / owner**: Define who receives alerts.
- **Severity**: P1 (data leak / full outage) vs P2 (degraded).
- **Post-incident**: Short root cause note for P1.

---

## 7. Revision

Update this document when auth, tenancy, or hosting choices change. Agents and humans should treat it as the **single harness checklist** for “are we SaaS-ready?” beyond code style.
