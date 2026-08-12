# Deployment guide — costing-app (SaaS)

Operational checklist for local development, staging, and production. **Never commit `.env` with real secrets.**

---

## 1. Environment variables

Copy the template and fill in values:

```bash
cp .env.example .env
```

| Variable | Required | Local | Staging | Production | Notes |
|----------|----------|-------|---------|------------|-------|
| `DATABASE_URL` | Yes | Docker Postgres URL | Neon pooled URL + `?sslmode=require` | Neon production branch | Use pooled connection on serverless |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes* | Clerk dev app | Clerk staging or same app | Clerk production app | *Optional only when `AUTH_BYPASS=true` (CI/test) |
| `CLERK_SECRET_KEY` | Yes* | Clerk dev | Clerk staging | Clerk production | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` | `/sign-in` | `/sign-in` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` | `/sign-up` | `/sign-up` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | `/` | `/` | `/` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | `/` | `/` | `/` | |
| `NODE_ENV` | Yes | `development` | `production` | `production` | |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | No | — | Optional | Recommended | Scaffold skips when unset |
| `SENTRY_ORG` / `SENTRY_PROJECT` | No | — | Optional | Recommended | For source maps upload |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | No | — | Optional | Recommended | In-memory fallback when unset |
| `AUTH_BYPASS` | **Never prod** | — | **Do not set** | **Do not set** | CI/test only (`true` + `TEST_USER_ID` + `TEST_ORG_ID`) |
| `OPERATOR_USER_IDS` | No* | Optional | Recommended | Recommended | Comma-separated Clerk user IDs for `/operator` UI; empty/unset = no operator UI access |
| `OPERATOR_API_KEY` | No* | Optional | Optional | Recommended for scripts | Bearer key for `/api/operator/*`; empty/unset = key auth disabled |

\*Operator APIs fail closed when both are unset. See [PRODUCT-PACKAGING.md](./PRODUCT-PACKAGING.md).

See [`.env.example`](../.env.example) for the canonical list.

---

## 2. Local development

### 2.1 Database (Docker Postgres)

**Prerequisite:** Docker Desktop running.

```bash
npm run db:up          # docker compose up -d postgres
npm run db:migrate     # prisma migrate deploy
npm run db:seed        # demo orgs + sample data
```

**Blocker (if Docker unavailable):** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or point `DATABASE_URL` at a hosted Neon **dev** database instead.

### 2.2 Clerk (dev application)

1. Create app at [Clerk Dashboard](https://dashboard.clerk.com).
2. Enable **Organizations**.
3. Disable public sign-up (invite-only B2B) if desired.
4. Copy publishable + secret keys into `.env`.
5. Set redirect URLs: `http://localhost:3000`.
6. **Do not** set `AUTH_BYPASS=true` when testing real auth locally.

### 2.3 Run the app

```bash
npm run dev
```

Verify: sign in → select/create org → `/settings` onboarding → create project → recalculate AHU → create quotation.

### 2.4 SQLite migration (optional legacy data)

If you still have `prisma/dev.db`:

```bash
node scripts/migrate-sqlite-to-postgres.mjs
```

---

## 3. Staging (Vercel + Neon)

### 3.1 Neon

1. Create Neon project → database `costing_staging`.
2. Copy **pooled** connection string → `DATABASE_URL` with `?sslmode=require`.
3. Enable automated backups / PITR when moving to production.

### 3.2 Vercel project

1. Import GitHub repo; set **Node.js 24** (see `package.json` `engines`).
2. Build command (see `vercel.json`): `prisma migrate deploy && npm run build`.
3. Set environment variables from §1 (staging column).
4. **Do not** set `AUTH_BYPASS`.
5. Deploy; confirm `/api/health` returns `{ "status": "ok", "db": "connected" }`.

### 3.3 Post-deploy

```bash
# Against staging DATABASE_URL (if not run in build):
npx prisma migrate deploy
npx prisma db seed   # optional demo data
```

### 3.4 Smoke test

Walk [SMOKE-TEST-CHECKLIST.md](./SMOKE-TEST-CHECKLIST.md) on the staging URL.

---

## 4. Production launch

Only after [SAAS-LAUNCH-AUDIT.md](./SAAS-LAUNCH-AUDIT.md) gate **PASS**.

1. Clone staging env → Vercel **Production** + Neon **production** branch.
2. Enable Neon automated backups + PITR.
3. Configure Sentry alerts → on-call channel (see [PRODUCTION-HARNESS.md](./PRODUCTION-HARNESS.md) §6).
4. Confirm `/legal/privacy` and `/legal/terms` linked in app footer.
5. Attach audit doc link in release notes.
6. Run pilot on staging for ≥1 week before promoting (see plan).

---

## 5. Rollback procedure

| Step | Action |
|------|--------|
| 1 | **Vercel:** Promote previous deployment (Deployments → … → Promote to Production). |
| 2 | **Database:** If migration was destructive, restore Neon PITR snapshot to a branch and repoint `DATABASE_URL`. |
| 3 | **Verify:** `/api/health`, sign-in, one costing recalculate, one quotation export. |
| 4 | **Communicate:** Post in on-call channel; notify pilot customers if data-affecting. |

**Prevention:** Always run `prisma migrate deploy` on staging before production; keep migration SQL in version control.

---

## 6. Clerk dashboard checklist (screenshot for audit)

- [ ] Organizations enabled
- [ ] Sign-up mode (invite-only vs open) documented
- [ ] Redirect URLs for staging + production domains
- [ ] API keys rotated after any leak suspicion

---

## 7. Manual steps (cannot be automated in repo)

| Task | Owner |
|------|-------|
| Create Clerk application(s) | You |
| Create Neon project + branches | You |
| Create Vercel project + env vars | You |
| Pilot user onboarding (1 week) | Product / engineering |
| On-call contact names in PRODUCTION-HARNESS §6 | Engineering lead |
