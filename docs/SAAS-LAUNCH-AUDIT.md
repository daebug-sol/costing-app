# SaaS launch audit — costing-app

**Audit date:** 2026-07-03  
**Scope:** SaaS go-live phase (tenant hardening, deploy prep, pre-launch gate)  
**Environment:** Local codebase only — **no staging URL** available for runtime/browser audits.

---

## Executive summary

| Gate | Result |
|------|--------|
| **Automated (local)** | **PASS** — `npm test` (84/84), `npm run build`, eslint 0 errors |
| **Tenant isolation (code)** | **PASS** — nested project + custom-db routes use org verifiers |
| **Staging / pilot / runtime** | **NOT RUN** — requires Clerk keys, Neon, Vercel deploy |
| **Overall launch decision** | **CONDITIONAL FAIL** — safe to proceed to **staging deploy + pilot**; **block production** until staging IDOR walk + pilot complete |

---

## 1. Automated gates

| Check | Command | Result | Evidence |
|-------|---------|--------|----------|
| Unit/integration tests | `npm test` | **PASS** | 12 suites, 84 tests |
| Production build | `npm run build` | **PASS** | Next.js 16.2.0 compile OK |
| Lint | `npm run lint` | **PASS** (warnings) | 0 errors, 37 warnings (pre-existing) |
| Typecheck (strict) | `npx tsc --noEmit` | **FAIL** | Test fixture types missing `organizationId` (non-blocking for build) |
| Dependency audit | `npm audit` | **WARN** | 27 vulns (13 high) — mostly dev/transitive (prisma dev, next, hono) |
| Tenant isolation tests | `lib/tenant-isolation.test.ts` | **PASS** | 11 tests for project/segment/section/manual/row helpers |
| CI workflow | `.github/workflows/ci.yml` | **VALID** | lint → test → build; `AUTH_BYPASS=true` only in CI |

---

## 2. Security & tenancy (code review)

### 2.1 Fixed in Sprint 1 (was Critical)

| Finding | Severity | Status |
|---------|----------|--------|
| Project nested routes looked up by `projectId` only | **Critical** | **Fixed** — `requireProjectInOrg` + `tenantWhere` on all nested handlers |
| Custom DB cell/row/table ops without org check | **Critical** | **Fixed** — `requireCustomTableInOrg` / `requireCustomRowInOrg`; `applyCustomDbCellValue` takes `orgId` |
| `projects/available` listed all orgs' projects | **Critical** | **Fixed** — `tenantWhere.projects(orgId)` |
| Import route used `appSettings.findFirst()` without org | **High** | **Fixed** — scoped to `organizationId: orgId` |

**Grep verification:** All handlers under `app/api/projects/**` and `app/api/custom-db/**` call an org verifier or `tenantWhere` scoping.

### 2.2 Remaining code findings (out of Sprint 1 scope)

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| `app/api/quotations/**` — `orgId` destructured but not used in some handlers | **High** | Open | Same IDOR pattern as pre-fix projects; patch before production |
| `app/api/database/**`, `materials/[id]`, `profiles/[id]`, `components/[id]` — unused `orgId` | **High** | Open | ESLint warnings; verify each uses `tenantWhere` or verifier |
| `AUTH_BYPASS` in CI only | **Low** | OK | `.github/workflows/ci.yml` — not for staging/prod |
| No RBAC on `/api/org/delete` | **Medium** | Documented | Any org member can delete; owner-only RBAC post-v1 |
| `dangerouslySetInnerHTML` / `eval` | **Low** | Not found in app routes | Custom-db formula uses sandboxed evaluator |

### 2.3 Secrets scan

| Check | Result |
|-------|--------|
| `.env` in git | Not tracked (good) |
| Hardcoded API keys in source | None found in audit scope |
| `.env.example` complete | **PASS** — Clerk, DB, Sentry, Upstash, AUTH_BYPASS documented |

### 2.4 AUTH_BYPASS

- `lib/auth.ts` / `lib/tenant-context.ts`: bypass only when `AUTH_BYPASS=true` + test env.
- **Staging/production:** must not set. Documented in `docs/DEPLOY.md`.

---

## 3. Prisma data layer checklist

| Item | Status |
|------|--------|
| Root tenant models have `organizationId` | ✅ Schema |
| `tenantWhere` helpers centralized | ✅ `lib/tenant-queries.ts` |
| Nested routes verify chain to project/table | ✅ Sprint 1 |
| Multi-step recalculate in transaction | ✅ Existing |
| Migrations tracked | ✅ `prisma/migrations/` |
| `db push --accept-data-loss` in prod scripts | ⚠️ Only in legacy `db:migrate-segments` script — not in deploy path |
| Backup strategy documented | ✅ DEPLOY.md → Neon PITR |

---

## 4. Parallel code review (tenant diff)

| Lens | Finding | Severity |
|------|---------|----------|
| **Security** | Sprint 1 closes primary IDOR on projects + custom-db | Fixed |
| **Security** | Quotations/database [id] routes still need same pass | High — open |
| **Performance** | `requireProjectInOrg` + nested verifiers = extra DB round-trip per request | Low — acceptable |
| **Correctness** | 404 (not 403) on cross-tenant IDs — consistent | Good |
| **Readability** | Pattern `guardApiRoute` → `require*InOrg` → work is consistent | Good |

---

## 5. Runtime audits (not executed)

| Skill / check | Status | Blocker |
|---------------|--------|---------|
| Network request auditing (staging) | **Skipped** | No staging URL |
| Browser smoke (sign-in → recalc → PDF) | **Skipped** | No Clerk keys / staging |
| Accessibility (`/sign-in`, onboarding) | **Skipped** | No running app with auth |
| Costing export spot-check per org | **Skipped** | No staging data |
| 2-org IDOR manual test | **Skipped** | Requires staging + 2 Clerk orgs |

Use [SMOKE-TEST-CHECKLIST.md](./SMOKE-TEST-CHECKLIST.md) when staging is live.

---

## 6. npm audit summary

**27 vulnerabilities** (1 low, 13 moderate, 13 high).

Notable:

- **next@16.2.0** — multiple DoS/XSS advisories; fix suggests `16.2.10` (patch bump).
- **prisma dev tooling** — hono/defu/effect chain (dev-only).
- **exceljs → uuid** — moderate; export path only.

**Recommendation:** Run `npm audit fix` on a branch; evaluate `next@16.2.10` patch before production.

---

## 7. Severity table & fix status

| ID | Severity | Finding | Fix status |
|----|----------|---------|------------|
| F-01 | Critical | Cross-tenant project nested API writes | **Fixed** (Sprint 1) |
| F-02 | Critical | Cross-tenant custom-db cell/row writes | **Fixed** (Sprint 1) |
| F-03 | High | Quotation [id] routes org scoping | Open |
| F-04 | High | Database folder/file [id] org scoping | Open |
| F-05 | High | npm audit — next.js advisories | Open — patch bump |
| F-06 | Medium | org/delete no owner RBAC | Documented waiver |
| F-07 | Medium | tsc strict failures in test fixtures | Open — low risk |
| F-08 | Low | ESLint warnings (unused orgId) | Open — indicates F-03/F-04 |

---

## 8. Sign-off

| Role | Decision | Conditions |
|------|----------|------------|
| **Automated code gate** | **PASS** | Tests + build green; tenant helpers + route patches merged |
| **Staging deploy** | **ALLOWED** | Proceed with DEPLOY.md manual steps |
| **Production launch** | **FAIL** (conditional) | Requires: (1) staging live, (2) smoke checklist §9–15 PASS, (3) 1-week pilot, (4) F-03/F-04 patched or waived, (5) next.js patch evaluated |

**Signed:** Agent audit (local) — **2026-07-03**  
**Human sign-off:** _________________ **Date:** _________

---

## 9. Manual steps for owner

1. Start Docker Desktop → `npm run db:up` → migrate → seed (or use Neon dev).
2. Create Clerk app; copy keys to `.env`; test login locally.
3. Deploy Vercel staging + Neon; run smoke checklist.
4. Patch quotation/database [id] routes (same pattern as Sprint 1).
5. `npm audit fix` + evaluate Next.js 16.2.10.
6. Re-run this audit after pilot → update sign-off to **PASS** for production.
