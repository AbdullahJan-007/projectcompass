# 10 — Deployment Architecture, Observability & Cost Estimation

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 19 (Deployment Architecture), Section 20 (Observability & Monitoring), Section 21 (Cost Estimation)

---

## 19. Deployment Architecture & Production Parity

### Local Development vs. Production Parity

| Aspect | Local Development | Production (Vercel + Managed Services) |
| :--- | :--- | :--- |
| **PostgreSQL + `pgvector`** | `docker compose up -d db` (`pgvector/pgvector:pg16`) | Supabase PostgreSQL with `pgvector` extension enabled |
| **Prisma Connection** | Local direct URL | Pooled `DATABASE_URL` (port `6543`, `pgbouncer=true`) + `DIRECT_URL` (port `5432`) for CI migrations |
| **Background Jobs** | `npx inngest-cli@latest dev` | Inngest Cloud synced automatically via Vercel integration |
| **Webhooks (Clerk/Resend)** | Tunnel (`ngrok` / Clerk dev webhook) | Live HTTPS `https://<domain>/api/webhooks/*` with production signing secrets |
| **Env Validation** | `.env.local` validated by `src/lib/env.ts` | Vercel Encrypted Environment Variables (Preview vs. Production isolated) |
| **Self-Host Option (University On-Prem)** | `docker-compose.yml` | Multi-stage Next.js standalone `Dockerfile` + `docker-compose.prod.yml` |

### CI Pipeline (`.github/workflows/ci.yml`)
Every push and Pull Request to `main` runs one job (`ubuntu-latest`, 15-minute timeout, superseded runs cancelled via `concurrency`) against a live **`pgvector/pgvector:pg16` service container** with a CI-only `AUTH_SECRET`:

1. `pnpm install --frozen-lockfile` (pnpm 10, Node.js 22, `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`)
2. `pnpm prisma validate` → `pnpm prisma generate` → `prisma/ensure-vector.ts` (creates the `vector` extension) → `pnpm prisma db push` → `pnpm db:seed`
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm lint` (`eslint . --max-warnings=0`)
5. `pnpm test` (Vitest unit, integration & red-team security suites)
6. `pnpm build` (production bundle; fonts load at runtime, so the build makes no external font fetch)
7. `pnpm start` → wait until `/api/health` reports `"db":"connected"` → `pnpm test:e2e` (Playwright Chromium)

> **Build note:** ESLint runs as its own CI step, so `next.config.ts` sets `eslint.ignoreDuringBuilds: true` to avoid a duplicate (and flat-config-incompatible) lint pass during `next build`. `devIndicators: false` hides the dev overlay badge.

### Production Deployment (Recommended: Vercel + Managed PostgreSQL)
1. **Database:** Provision PostgreSQL 16 with `pgvector` (Supabase or Neon). Use the pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL`.
2. **Environment variables (Production & Preview isolated):** `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (≥ 32 random chars, unique per environment), `NEXT_PUBLIC_APP_URL`, plus optional LLM / Inngest / UploadThing / Resend / PostHog / Sentry keys from `.env.example`.
3. **Migrations:** Run `pnpm prisma migrate deploy` with `DIRECT_URL` before shifting traffic (never `db push` against production).
4. **Seed only reference data:** Skills, archetypes, market benchmarks, and departments. Do **not** load the local demo accounts into production; create real faculty/admin accounts through the governed admin flow.
5. **Deploy & verify:** Import the GitHub repo in Vercel (Next.js preset), protect `main` with the required `CI` status check, and confirm `GET /api/health` returns `200` after every deploy.
6. **Self-host alternative:** Multi-stage standalone `Dockerfile` (uses `pnpm-lock.yaml` with `--frozen-lockfile`) behind a TLS reverse proxy, with the same env variables and migration step.

### Production Readiness Checklist
- [ ] `AUTH_SECRET` set in every deployed environment (`token-signer.ts` fails closed in production and throws if it is missing or a placeholder).
- [ ] Demo accounts absent from the production database.
- [ ] `DATABASE_URL` points at a reachable production database (the local temp-file fallback store is a development convenience and is not durable on serverless hosts).
- [ ] Branch protection on `main` requires the CI check to pass.
- [ ] `/api/health` monitored with alerting.

---

## 20. Observability & Monitoring

| Signal | Tool | Tracked Metrics & Alerts |
| :--- | :--- | :--- |
| **Exceptions & Performance** | **Sentry** | Unhandled Server Action errors, webhook signature failures, LLM fallback spike (`> 10%` of runs in 1h alerts immediately), `p95` Server Action latency. |
| **Product Funnel & Quality** | **PostHog** | `profile_completed`, `recommendation_generated` (with `usedFallback` boolean), `idea_shortlisted`, `supervision_request_sent`, `supervision_request_accepted`, `roadmap_generated`. |
| **Structured Server Logs** | JSON Logger (`src/lib/logger.ts`) | Emits `{ timestamp, level, requestId, action, durationMs, status }` — zero raw PII or API keys logged. |
| **Service Level Objectives (SLOs)** | `/api/health` + Sentry | API availability `>= 99.5%`; CRUD `p95 < 400ms`; Recommendation pipeline `p95 < 12s`; Fallback rate `< 2%`. |

---

## 21. Cost Estimation (Transparent Monthly Tiers)

| Service | Tier 1: FYP / Pilot (`<= 300` students) | Tier 2: Single University (`1,500` students) | Tier 3: Multi-University SaaS (`10,000` students) |
| :--- | :---: | :---: | :---: |
| **Vercel Hosting** | `$0` (Hobby) | `$20` (Pro) | `$20–$60` (Pro + usage) |
| **Supabase PostgreSQL (`pgvector`)** | `$0` (Free) | `$25` (Pro, 8GB DB + backups) | `$75` (Pro + compute add-on) |
| **Clerk Auth** | `$0` (`< 10k` MAU free) | `$0` (`< 10k` MAU free) | `$0` up to 10k MAU *(at >10k MAU: evaluate `$0.02/MAU` vs. Custom JWT migration via auth adapter)* |
| **LLM + Embeddings (`gpt-4o-mini` + `text-embedding-3-small`)** | `~$2` | `~$12` | `~$75` (rate-limited `5` runs/day) |
| **Inngest (Async Jobs)** | `$0` (Free tier) | `$0` (Free tier) | `$50` (Pro) |
| **UploadThing (PDFs/CSVs)** | `$0` (Free 2GB) | `$10` | `$25` *(or migrate archives >100GB to Cloudflare R2 `~$2/mo`)* |
| **Resend (Email)** | `$0` (3k emails/mo) | `$20` (Pro) | `$20` |
| **PostHog + Sentry** | `$0` (Free tiers) | `$0` (Free tiers) | `$26–$50` |
| **Estimated Monthly Total** | **`~$2 / month`** | **`~$87 / month`** | **`~$291–$355 / month`** |

**Unit Economics Note:** At 10,000 students across 5–8 universities, infrastructure cost is roughly **`$0.035 / student / month`**, enabling healthy SaaS gross margins (`> 85%`) at standard institutional licensing (`$2–$5 / student / year`).
