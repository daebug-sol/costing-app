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

## 2. Current baseline (SaaS launch checklist)

Verify in code and deployment; update status as you ship features.

| Area | Target state for SaaS | Status | Verified |
|------|------------------------|--------|----------|
| **Auth** | Real user accounts (email/OAuth/SSO); sessions; password or IdP policies. | ✅ Clerk (`@clerk/nextjs`), middleware route protection, `lib/auth.ts` | Code + CI; staging login pending manual |
| **Multi-tenancy** | `organizationId` on tenant-owned models; **every** query scoped; no cross-tenant leakage in APIs. | ✅ `Organization` model, `lib/tenant-context.ts`, nested route verifiers, isolation tests | Automated tests PASS; staging IDOR walk pending |
| **Database** | Hosted Postgres with backups, PITR if required; migrations in CI. | ✅ Postgres datasource, `docker-compose.yml`, migrate in CI/build | Neon backup enablement pending manual |
| **Secrets** | Only in environment / vault on the host; rotateable; never in git. | ✅ `.env.example` template; no secrets in repo | Grep audit PASS |
| **API security** | HTTPS; CSRF via Clerk session cookies (SameSite=Lax); rate limits on expensive routes. | ✅ `lib/rate-limit.ts` on recalculate/import; auth on all API routes except `/api/health` | Rate limit code present; prod load test pending |
| **Observability** | Structured logs; error tracking (Sentry); optional metrics. | ✅ `lib/logger.ts`, Sentry scaffold (env-gated) | Sentry test event pending manual |
| **CI** | Lint, test, build on every PR; block merge on failure. | ✅ `.github/workflows/ci.yml` | Local: test/build PASS |
| **Legal / privacy** | Privacy policy, terms; data export/delete for GDPR-style compliance. | ✅ `/legal/privacy`, `/legal/terms`, `/api/org/export`, `/api/org/delete`, footer links | Pages exist; staging URL check pending |
| **Product modules** | Per-org plan + entitlements (Free/Standard/Enterprise; AHU SKU) gated in API + UI; operator-managed. See [PRODUCT-PACKAGING.md](./PRODUCT-PACKAGING.md). | ✅ `Organization.plan` + `ahuModuleEnabled`; `lib/org-entitlements.ts`, `lib/org-modules.ts`; settings exposes read-only `plan` + `modules.ahu` | Enterprise + AHU: `UPDATE "Organization" SET plan = 'enterprise', "ahuModuleEnabled" = true WHERE slug = '…';` (or seed) |

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

### On-call / owner

| Role | Contact | Channel |
|------|---------|---------|
| **Primary on-call** | Engineering lead (define name) | Slack `#costing-app-alerts`, email |
| **Backup** | Secondary engineer | Same channel |
| **Product / customer** | Account owner for pilot customers | Direct contact for P1 comms |

Sentry alerts route to the primary on-call when `SENTRY_DSN` is configured. Vercel deployment notifications go to the engineering Slack channel.

### Severity levels

| Level | Definition | Response target | Examples |
|-------|------------|-----------------|----------|
| **P1** | Data leak, auth bypass, or full outage affecting all tenants | Acknowledge ≤ 15 min; mitigate ≤ 2 h | Cross-tenant data visible; app unreachable; DB corruption |
| **P2** | Degraded service or single-tenant impact | Acknowledge ≤ 1 h; fix or workaround ≤ 1 business day | Recalculate failures; slow imports; staging-only regression |
| **P3** | Minor bug, cosmetic, non-blocking | Next sprint | UI glitch; non-critical export formatting |

### Response playbook (P1)

1. **Acknowledge** — Post in `#costing-app-alerts` with severity and impact scope.
2. **Contain** — Revoke compromised keys; disable affected route via Vercel if needed; rotate Clerk/DB credentials if leak suspected.
3. **Communicate** — Notify affected pilot customers within 4 h for data-related P1.
4. **Fix** — Hotfix branch → staging smoke → production deploy.
5. **Post-incident** — Short root-cause note (what, why, prevention) within 48 h for P1.

### Post-incident

- P1: mandatory blameless postmortem (timeline, root cause, action items).
- P2: optional short note in team channel.
- Log retention: Sentry 90 days; Vercel logs per plan.

---

## 7. Revision

Update this document when auth, tenancy, or hosting choices change. Agents and humans should treat it as the **single harness checklist** for “are we SaaS-ready?” beyond code style.
