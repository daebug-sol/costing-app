# Product packaging — plans & modules

This document describes how **costing-app** is packaged for SaaS: public tiers, the private AHU module, org RBAC, and how operators enable Enterprise clients. Implementation lives in `Organization.plan`, `Organization.ahuModuleEnabled`, `OrganizationMember.role`, `lib/org-entitlements.ts`, `lib/org-modules.ts`, `lib/org-roles.ts`, and `lib/permissions.ts`.

---

## One product

- **One repo, one deploy, one website** — no AHU fork, no long-lived product branch that strips features.
- **Tenancy:** one `Organization` per client company; workers are org members with **app-owned roles** (below). Clerk handles sign-in and org membership invites (`OrganizationSwitcher`); the **app role** is assigned in Settings → Anggota.

---

## Public tiers

| Plan | Intended use | Caps (this pass) | AHU |
|------|----------------|------------------|-----|
| **Free** | Limited demo / trial | max **2** projects, max **3** quotations | Never (unless operator mistakenly enables — do not sell this way) |
| **Standard** | General costing + O2C | No project/quotation caps | Off by default; not listed on public pricing |
| **Enterprise** | Contract / custom clients | No project/quotation caps | Optional private module (`ahuModuleEnabled`) |

**Pro** and self-serve billing are deferred. Public marketing should only advertise Free + Standard; Enterprise/AHU is sales-assisted.

---

## Private AHU module

- AHU costing SKU is **operator-managed**, not a self-serve toggle and not on public pricing.
- Gate: `Organization.ahuModuleEnabled` via `lib/org-modules.ts` (`requireAhuModule` → `403` / `AHU_MODULE_DISABLED`).
- Settings API exposes read-only `modules.ahu` and `plan`. Clients **cannot** set `plan` or `modules` on `PUT /api/settings`.

---

## Free usage enforcement

- `lib/org-entitlements.ts` — `FREE_LIMITS` and `assertWithinPlanLimits`.
- Create routes return `403` with `code: "PLAN_LIMIT_REACHED"` when a Free org would exceed caps:
  - `POST /api/projects`
  - `POST /api/quotations`
- Standard and Enterprise have no project/quotation caps in this pass.

---

## Org RBAC (app-owned roles)

Roles are stored as strings on `OrganizationMember.role` (validated in code — not a Prisma enum):

`owner` | `admin` | `sales` | `pm` | `ppic` | `ceo` | `member`

- First org creator is `owner` (`lib/tenant-context.ts`).
- Missing membership rows are upserted as `member` on API guard.
- Auth bypass / tests default to `owner` unless `TEST_ORG_ROLE` is set.
- Mutate APIs call `requirePermission(role, cap)` after `guardApiRoute` → `403` `{ code: "FORBIDDEN" }` when denied. GET/list stays open for any org member (v1).
- Client: `GET /api/settings` and `GET /api/me` expose `{ role, permissions }`. Navbar filters by `canSeeNavHref`; Settings write controls require `settings:write`.

### Permission matrix (v1)

| Cap | owner | admin | sales | pm | ppic | ceo | member |
|-----|-------|-------|-------|----|------|-----|--------|
| `dashboard:read` | y | y | y | y | y | y | y |
| `costing:read` | y | y | y | y | y | y | y |
| `costing:write` | y | y | — | y | — | — | — |
| `customers:write` | y | y | y | — | — | — | — |
| `o2c:quote` | y | y | y | — | — | — | — |
| `o2c:order` | y | y | y | — | — | — | — |
| `o2c:delivery` | y | y | — | — | y | — | — |
| `o2c:invoice` | y | y | — | — | — | — | — |
| `o2c:payment` | y | y | — | — | — | — | — |
| `db:read` | y | y | y | y | y | y | y |
| `db:write` | y | y | — | — | y | — | — |
| `settings:write` | y | y | — | — | — | — | — |
| `members:manage` | y | y | — | — | — | — | — |
| `org:danger` | y | — | — | — | — | — | — |

`org:danger` = delete organization only. Member role management: `GET`/`PATCH /api/org/members` (`members:manage`). Only an **owner** may assign or change the `owner` role; cannot demote the last owner.

CEO is **read-heavy** (dashboards + read caps; ops nav visible as viewer). Writes stay with ops roles.

---

## Operator enablement (AHU / Enterprise client)

Platform operators manage `plan` and `ahuModuleEnabled` via **`/operator`** (allowlisted Clerk users) or the operator API (Bearer key). Client org admins cannot set these fields on `PUT /api/settings`.

### UI

1. Set `OPERATOR_USER_IDS` to a comma-separated list of Clerk user IDs.
2. Sign in as an allowlisted user → open **Operator** in the navbar.
3. Set plan (`free` / `standard` / `enterprise`) and AHU switch, then **Simpan**.

Consistency: Free clears AHU; AHU on requires Enterprise.

### API (scripts)

```bash
# List orgs
curl -s -H "Authorization: Bearer $OPERATOR_API_KEY" \
  https://<host>/api/operator/orgs

# Enable Enterprise + AHU for an org
curl -s -X PATCH -H "Authorization: Bearer $OPERATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"plan":"enterprise","ahuModuleEnabled":true}' \
  https://<host>/api/operator/orgs/<orgId>
```

Env (see `.env.example`): `OPERATOR_USER_IDS`, `OPERATOR_API_KEY`. Both fail closed when unset/empty.

Local seed still sets the DAE/dev org to `plan: enterprise` and `ahuModuleEnabled: true`.

---

## Out of scope (for now)

- Clerk custom role sync
- Field-level masking (e.g. hide margin from sales)
- Stripe / checkout
- Public pricing page
- Removing AHU code from the repository
- Operator audit log table / impersonation
