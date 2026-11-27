# 10 — Deployment, CI/CD & Operations (v2.0)

ProjectCompass deploys cleanly on **Vercel** (Next.js 15 App Router) paired with **Supabase PostgreSQL 17 + `pgvector`**.

---

## 1. Environment Matrix

| Component | Local Development | Production (Vercel + Supabase) |
| :--- | :--- | :--- |
| **Dev Server** | `pnpm exec next dev --turbopack` (`http://localhost:3000`) | Vercel Serverless / Edge (`NEXT_PUBLIC_APP_URL`) |
| **Database** | Supabase Pooler or local `pgvector` Docker (`docker-compose.yml`) | Supabase Transaction Pooler (`:6543`) + Session Pooler (`:5432`) |
| **Demo Data** | Optional via `SEED_DEMO_DATA=true` (local & CI only) | **Disabled** (`SEED_DEMO_DATA` unset/false — reference catalog + Bootstrap Admin only) |
| **Timezone** | Live Pakistan Standard Time (`Asia/Karachi`, Islamabad · PKT) | Live Pakistan Standard Time (`Asia/Karachi`, Islamabad · PKT) |

---

## 2. Production Deployment Checklist

1. **Required Environment Variables (Vercel Project Settings):**
   - `DATABASE_URL` (Supabase Transaction Pooler `:6543?pgbouncer=true&connection_limit=1&sslmode=require`)
   - `DIRECT_URL` (Supabase Session Pooler `:5432?sslmode=require`)
   - `AUTH_SECRET` (64-character random hex string — mandatory fail-closed in production)
   - `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PIN`
   - `NEXT_PUBLIC_APP_URL` (production HTTPS origin)
   - Optional AI & Email: `AI_PROVIDER_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL`, `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
2. **Database Sync & Reference Seed:**
   ```bash
   pnpm prisma generate
   pnpm exec tsx prisma/ensure-vector.ts
   pnpm prisma db push
   pnpm db:seed
   ```
   Verify `21/21` RLS enabled, `0` unindexed FKs, `Department=6`, `Skill=62`, `SeedIdeaTemplate=42`, `MarketTrendSnapshot=12`, and `User=1` (your Bootstrap Admin).
3. **Health Check:** Confirm `GET /api/health` returns HTTP `200` with `{"status":"ok","db":"connected"}`.

---

## 3. GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)

Every push and PR to `main` runs against an isolated `pgvector/pgvector:pg16` service container:
1. `pnpm install --frozen-lockfile`
2. `pnpm prisma validate` → `prisma generate` → `ensure-vector.ts` → `prisma db push` → `pnpm db:seed` (CI-only `SEED_DEMO_DATA=true`)
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm lint` (`eslint . --max-warnings=0`)
5. `pnpm test` (`31/31` Vitest)
6. `pnpm build` (`next build`)
7. `pnpm start` + `/api/health` readiness check + `pnpm test:e2e` (`3/3` Playwright E2E)
