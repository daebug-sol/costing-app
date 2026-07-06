# Smoke test checklist — staging gate

Use on **staging URL** after deploy. Based on [UX-ACCEPTANCE-SCENARIOS.md](./UX-ACCEPTANCE-SCENARIOS.md). Check each box before pilot / production promotion.

**Tester:** _______________ **Date:** _______________ **Staging URL:** _______________

---

## Core flows

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 1 | Login → Dashboard KPI load (Scenario 1) | [ ] | |
| 2 | Dashboard drill → Costing project (Scenario 2) | [ ] | |
| 3 | Database: add material / custom row (Scenario 6) | [ ] | |
| 4 | Costing: create project + AHU segment + recalculate (Scenarios 3–4) | [ ] | |
| 5 | Documentation: quotation + export PDF (Scenario 5) | [ ] | |
| 6 | Settings: update forex + company profile | [ ] | |
| 7 | Error recovery: 5xx shows toast + retry (Scenario 7) | [ ] | |
| 8 | Mobile 390px: navbar menu + primary tasks (Scenario 8) | [ ] | |

---

## SaaS-specific

| # | Flow | Pass? | Notes |
|---|------|-------|-------|
| 9 | Org isolation: User A (Org A) cannot see Org B projects/quotations | [ ] | |
| 10 | IDOR: Org A `GET /api/projects/{orgBProjectId}` → **404** | [ ] | |
| 11 | IDOR: Org A `PATCH /api/custom-db/cells` with Org B `rowId` → **404** | [ ] | |
| 12 | `/api/org/export` returns JSON for signed-in org | [ ] | |
| 13 | `/api/health` → `{ status: "ok", db: "connected" }` | [ ] | |
| 14 | Logout → `/costing` redirects to sign-in | [ ] | |
| 15 | `AUTH_BYPASS` **not** set in Vercel env | [ ] | |

---

## CI / release

| # | Check | Pass? | Notes |
|---|-------|-------|-------|
| 16 | GitHub Actions CI green on release branch | [ ] | Link: |
| 17 | `npm test` + `npm run build` pass locally on release SHA | [ ] | |

---

## Pilot gate (1 week)

| # | Criterion | Pass? | Notes |
|---|-----------|-------|-------|
| 18 | ≥1 pilot user active on staging | [ ] | |
| 19 | No P1 (data leak, outage) during pilot | [ ] | |
| 20 | Audit gate [SAAS-LAUNCH-AUDIT.md](./SAAS-LAUNCH-AUDIT.md) **PASS** | [ ] | |

**Sign-off:** _______________ **Date:** _______________
