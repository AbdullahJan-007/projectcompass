# ProjectCompass

[![CI](https://github.com/AbdullahJan-007/projectcompass/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AbdullahJan-007/projectcompass/actions/workflows/ci.yml)
![Next.js 15.5](https://img.shields.io/badge/Next.js-15.5-0F172A?style=flat-square)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9_Strict-0F766E?style=flat-square)
![PostgreSQL pgvector](https://img.shields.io/badge/PostgreSQL-pgvector-1E40AF?style=flat-square)
![Playwright E2E](https://img.shields.io/badge/E2E-Playwright-15803D?style=flat-square)

**AI-Powered Final-Year Project (FYP) Idea, Feasibility & Supervisor Recommendation Platform** for the **Department of Information Technology & Computing** (`BSIT` · `BSCS` · `BSSE` · `BSAI` · `BSCY` · `BSDS`) across all Fall & Spring academic batches.

**Author:** Abdullah Jan

---

## Overview

University Final-Year Project selection routinely fails at two extremes: students either propose saturated CRUD clones that fail novelty review, or commit to over-scoped research topics that stall mid-semester due to unmeasured skill and time gaps. Meanwhile, faculty supervisors face misaligned proposals and uneven workload distribution.

**ProjectCompass** models FYP selection as a constrained engineering decision problem using a **3-Stage Hybrid Recommendation Engine**:

```text
Student Profile (Skills, Hours, Interests, Batch, IT Program)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Stage 1 · Deterministic SQL Filtering & Capacity Guard                │
│  • Decodes institutional identity (Reg No → Batch, Intake, Program)   │
│  • Filters supervisors by activeSlots < maxSlots & isAccepting = true │
│  • Filters project archetypes by effort-to-time budget                │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Stage 2 · Semantic Retrieval (pgvector HNSW) & Feasibility Scoring    │
│  • Cosine similarity over 42 curated archetypes & past FYP archives   │
│  • Anti-duplicate gate: >= 0.72 Moderate Risk, >= 0.82 High Risk      │
│  • Explainable 0–100 score: Skill (40) + Time (30) + Resource (20)    │
│    + Supervisor Fit (10)                                              │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Stage 3 · MMR Diversity Selection & Guardrailed AI Synthesis          │
│  • Selects 3 distinct tracks: Core/Safe, Career-Stretch, Research     │
│  • Vercel AI SDK (Gemini / OpenAI-compatible) + strict Zod schema     │
│  • Deterministic fallback (COMPLETED_FALLBACK) guarantees uptime      │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key Capabilities

- **Department-Wide & Multi-Batch Support:** Deterministically parses University Registration Numbers (`B[YY][F/S][4-Digits][DEPT][3-Digits]`, e.g., `B22F0512IT673`) to resolve batch year, Fall/Spring intake, roll number, and degree program across **`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, and `BSDS`**.
- **Four-Role Access Control (RBAC):** Dedicated server-guarded workspaces for **Students**, **Faculty Supervisors**, **FYP Coordinators**, and **University Admins**, backed by HMAC-SHA256 signed cookies with 7-day expiry, canonical login rate limiting, and fail-closed production `AUTH_SECRET` enforcement.
- **Anti-Duplicate Archive Intelligence:** `pgvector` HNSW cosine similarity compares proposals against historical departmental archives, flagging high-overlap topics (`>= 0.82`) with concrete differentiation angles.
- **Race-Safe Supervisor Matching:** Availability-aware faculty ranking with atomic PostgreSQL slot locking (`activeSlots < maxSlots` inside interactive transactions + database `CHECK` constraints) preventing concurrent over-allocation.
- **Calibrated Execution Roadmaps:** Deterministic week allocator distributes skill-gap preparation weeks and 4 execution phases across `12`–`36` weeks with milestone tracking and Markdown export.
- **Responsive Interface (`375px` → `1280px+`):** Mobile and tablet slide-over navigation drawer, accessible custom combobox selects, wrapping tabs, and viewport-safe dialogs — verified for zero horizontal overflow in Playwright.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & UI** | Next.js 15.5 (App Router), React 19, TypeScript 5.9 (Strict), Tailwind CSS v4, Radix UI / shadcn/ui, Lucide Icons |
| **Database & Vectors** | PostgreSQL 16/17 (Supabase), Prisma ORM 6.19, `pgvector` (`vector(1536)` + HNSW indexes), Row Level Security |
| **AI & Embeddings** | Vercel AI SDK (`generateObject`, `embed`), Google Gemini (`gemini-3.8-flash` / `gemini-embedding-001`) or OpenAI-compatible providers, Zod |
| **Auth & Security** | Institutional Reg No / Faculty Email + salted SHA-256 4-digit PIN, HMAC-SHA256 expiring sessions, optional Clerk SSO adapter |
| **Async & Integrations** | Inngest (archive ingestion), UploadThing (PDF/CSV), Resend (email notifications), PostHog, Sentry |
| **Verification & CI/CD** | Vitest 3.2 (31 unit/integration/security tests), Playwright 1.65 (3 E2E specs), GitHub Actions, Vercel, Docker |

---

## Quick Local Setup

### Prerequisites
- Node.js 22+ and `pnpm` 10+
- PostgreSQL 16+ with `pgvector` (Supabase or local Docker via `docker compose up -d db`)

### Steps
1. **Install dependencies:**
   ```bash
   pnpm install
   ```
2. **Configure environment:**
   Copy `.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, and a 32+ character `AUTH_SECRET`.
   - For local offline development without PostgreSQL, the app falls back to a temp-directory store (`os.tmpdir()`).
   - `AI_API_KEY` (Google Gemini or OpenAI-compatible) is optional; omitting it activates the deterministic fallback engine.
3. **Sync schema and seed reference catalog:**
   ```bash
   pnpm prisma generate
   pnpm exec tsx prisma/ensure-vector.ts
   pnpm prisma db push
   pnpm db:seed
   ```
   > `pnpm db:seed` loads only the production reference catalog (6 IT departments, 62 skills, 42 FYP archetypes, 12 market benchmarks). Demo accounts and sample archives are **local-only** and require `SEED_DEMO_DATA=true` in a non-production environment.
4. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000/sign-up` to register a Student or Faculty account.

---

## Production Deployment (Supabase + Vercel)

1. **Supabase Database:**
   - Enable the `vector` (`pgvector`) extension and apply the Prisma schema + HNSW indexes + RLS lockdown (`21/21` public tables with RLS enabled so the public PostgREST API is closed while Prisma connects via the database role).
   - Use the **Transaction Pooler** (port `6543`, `?pgbouncer=true&connection_limit=1&sslmode=require`) for `DATABASE_URL` and the **Session Pooler** (port `5432`, `?sslmode=require`) for `DIRECT_URL`.
   - Run `pnpm db:seed` once to load the reference catalog (zero demo users are created in production).
2. **Vercel Project:**
   - Import the repository in Vercel and configure:
     - **Required:** `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (32+ random chars; enforced fail-closed in production), `NEXT_PUBLIC_APP_URL`
     - **Recommended (Live AI):** `AI_PROVIDER_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL`
     - **Optional:** `UPLOADTHING_TOKEN`, `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`
   - Deploy and verify `GET /api/health` returns `{"status":"ok","db":"connected"}`.

---

## Verification & CI Pipeline

Every push and pull request to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) against a live `pgvector/pgvector:pg16` service container:

```bash
pnpm typecheck   # TypeScript strict check (0 errors)
pnpm lint        # ESLint zero-warnings gate
pnpm test        # Vitest: 7 suites, 31 unit, integration & security tests
pnpm build       # Production Next.js App Router bundle
pnpm test:e2e    # Playwright: Student golden path, RBAC security & mobile/tablet responsive checks
```

---

## Documentation Index

| Document | Scope |
| :--- | :--- |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history and engineering updates |
| [`docs/specs/01-product-brief.md`](docs/specs/01-product-brief.md) | Product vision, scope, RBAC matrix, user stories, functional & non-functional requirements |
| [`docs/specs/02-workflows.md`](docs/specs/02-workflows.md) | State machines, transitions, failure paths, idempotency rules |
| [`docs/specs/03-architecture.md`](docs/specs/03-architecture.md) | System architecture, 3-stage hybrid engine formulas, tech decisions, repository structure |
| [`docs/specs/04-database-schema.md`](docs/specs/04-database-schema.md) | Prisma data model, `pgvector` HNSW indexes, pooling rules, reference catalog |
| [`docs/specs/05-api-design.md`](docs/specs/05-api-design.md) | Server Actions vs. Route Handlers, Zod contracts, error taxonomy |
| [`docs/specs/06-ai-policy.md`](docs/specs/06-ai-policy.md) | Embeddings, anti-duplicate thresholds, prompt-injection guardrails, fallback policy |
| [`docs/specs/07-design-system.md`](docs/specs/07-design-system.md) | WCAG 2.1 AA light-theme tokens, typography, component standards, responsive breakpoints |
| [`docs/specs/08-security-threat-model.md`](docs/specs/08-security-threat-model.md) | STRIDE threat model, session hardening, HTTP security headers, privacy controls |
| [`docs/specs/09-testing-strategy.md`](docs/specs/09-testing-strategy.md) | Unit, integration, concurrency, red-team security, and Playwright E2E test suites |
| [`docs/specs/10-deployment-and-ops.md`](docs/specs/10-deployment-and-ops.md) | CI/CD pipeline, Supabase + Vercel deployment, observability, cost tiers |
| [`docs/specs/11-roadmap-and-execution-plan.md`](docs/specs/11-roadmap-and-execution-plan.md) | Completed milestones (Phases 0–5) and post-MVP FYP-MS roadmap |
| [`docs/academic/fyp-defense-script.md`](docs/academic/fyp-defense-script.md) | Academic defense presentation script & technical viva Q&A |
| [`docs/academic/cv-bullets.md`](docs/academic/cv-bullets.md) | Engineering impact summary & portfolio highlights |
