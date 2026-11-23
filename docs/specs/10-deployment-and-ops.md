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

### CI/CD Pipeline (`.github/workflows/ci.yml`)
Every Pull Request to `main` executes:
1. `pnpm install --frozen-lockfile`
2. `pnpm prisma validate`
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm lint`
5. `pnpm test:unit`
6. `pnpm build` (verifies Next.js App Router production bundle compiles cleanly)

On merge to `main`:
1. Run `pnpm prisma migrate deploy` using `DIRECT_URL` before traffic shift.
2. Deploy immutable production build on Vercel and verify `/api/health` returns `200`.

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
