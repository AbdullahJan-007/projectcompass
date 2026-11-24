# ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System

[![CI](https://github.com/AbdullahJan-007/projectcompass/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AbdullahJan-007/projectcompass/actions/workflows/ci.yml)

**Author:** Abdullah Jan  
**System Class:** Production-Grade SaaS & Modular FYP Management System (FYP-MS) Core Module  
**Scope:** Entire **Department of Information Technology & Computing** (`BSIT` · `BSCS` · `BSSE` · `BSAI` · `BSCY` · `BSDS`) across **all active Fall & Spring batches**  
**Primary Stack:** Next.js 15.5 (App Router) + React 19, TypeScript 5.9 (Strict), Tailwind CSS v4 (`@tailwindcss/postcss`), custom-themed shadcn/ui (Radix UI), PostgreSQL 16 (`pgvector`), Prisma ORM 6.19, Dual-Mode Institutional Auth (University Reg No + Faculty Email with 4-digit PIN, HMAC-signed sessions, Clerk SSO adapter), Vercel AI SDK, Inngest, UploadThing, Resend, PostHog, Vitest 3.2, Playwright 1.65, GitHub Actions, Vercel, Docker

---

## 1. What ProjectCompass Solves

Final-Year Project (FYP) selection fails at scale across universities for two opposite reasons: students either recycle generic, saturated ideas (basic e-commerce clones, hospital CRUD apps) or propose unrealistic scopes that collapse midway through the semester. Meanwhile, faculty supervisors receive misaligned proposals or become overloaded while domain-matched supervisors remain underutilized.

**ProjectCompass** is an engineering-first recommendation and planning platform—not a thin LLM prompt wrapper. It evaluates a student's verified skill profile, interests, academic background, weekly time budget, and career goal through a **3-stage hybrid engine**:

1. **Deterministic SQL Filtering, Institutional Identity & Capacity Guard:** Authenticates students via University Registration Number pattern (`B[YY][F/S][4-Digits][DEPT][3-Digits]`, e.g., `B23F0184CS042`) and faculty via official University Email + 4-digit PIN, automatically extracting batch year, intake semester, IT program (`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`), and enforcing supervisor slot availability (`activeSlots < maxSlots`) and scope-to-time feasibility before ranking begins.
2. **Semantic Similarity & Anti-Duplicate Gate (`pgvector` + Explicit Scoring):** Searches 42 curated domain seed templates (solving Day-1 cold start) and historical department FYP archives via cosine similarity. Flags near-duplicates at similarity `>= 0.82` and computes a transparent **Explainable Feasibility Score (0–100)**.
3. **Guardrailed AI Synthesis (`Vercel AI SDK` + Zod):** Generates grounded differentiation angles, skill-gap learning plans, and week-by-week project roadmaps strictly from retrieved records—with deterministic fallbacks (`COMPLETED_FALLBACK`) if the LLM provider fails.

---

## 2. Multi-Batch, Department-Wide & Responsive by Design

| Capability | How It Works |
| :--- | :--- |
| **Any Batch (Fall & Spring)** | Batch year and intake are decoded from the Reg No (`B21F…`, `B22F…`, `B23S…`, `B24F…`). Nothing is hardcoded to a single cohort; the session carries a dynamic `batchLabel` such as `Fall 2022 · BSIT · Roll #512`. |
| **All 6 IT & Computing Programs** | `DEPARTMENT_MAP` in [`src/lib/auth/university-id.ts`](src/lib/auth/university-id.ts) maps `IT`, `CS`, `SE`, `AI`, `CY`, `DS` to `BSIT`…`BSDS` with stable department IDs. Sign-up, onboarding, supervisor filters, coordinator archives, and admin governance all expose every program. |
| **Program-Aware Faculty Matching** | Supervisors carry a `programCode`; students can filter faculty by program (e.g., `BSIT Faculty`) on `/dashboard/supervisors`. |
| **Evergreen Market Benchmarks** | Market trend snapshots use a rolling `Current Benchmark` label instead of a fixed quarter. |
| **Responsive UI (375px → 1280px+)** | Mobile/tablet sticky header with slide-over navigation drawer, wrapping tabs, viewport-safe dialogs, full-width filters on small screens, and desktop-only sticky side cards. Verified by Playwright with zero horizontal overflow at `375px` and `768px`. |
| **Session Context** | [`PortalSessionProvider`](src/components/layout/portal-session-context.tsx) exposes the signed-in user's role, program, and batch to every dashboard screen via `usePortalSession()`. |

---

## 3. Repository Documentation Map

Build specifications and academic deliverables are intentionally separated so agentic IDEs (such as Antigravity) index only executable engineering contracts and ignore presentation scripts.

| Path | Audience | Purpose |
| :--- | :--- | :--- |
| `ANTIGRAVITY_RULES.md` | Antigravity / AI Coding Agent | Mandatory architecture, UI/UX, strict TypeScript, and verification gates |
| `CHANGELOG.md` | Everyone | Release history and notable engineering changes |
| `.antigravityignore` | Antigravity IDE | Excludes `docs/academic/` from agent code-indexing context |
| `.env.example` | Developers / DevOps | Complete environment variable specification (zero secrets committed) |
| `docs/specs/01-product-brief.md` | Product & Engineering | Vision, scope, non-goals, RBAC matrix, user stories, functional & NFRs, MVP DoD |
| `docs/specs/02-workflows.md` | Engineering | Explicit state machines, transitions, failure paths, idempotency rules |
| `docs/specs/03-architecture.md` | Architects & Engineers | System architecture, 3-stage hybrid engine math, tech comparisons, risks, repo tree |
| `docs/specs/04-database-schema.md` | Backend Engineers | Complete Prisma schema, `pgvector` HNSW SQL migrations, pooling rules, seed data |
| `docs/specs/05-api-design.md` | Full-Stack Engineers | Server Actions vs. Route Handlers boundary, Zod contracts, error taxonomy |
| `docs/specs/06-ai-policy.md` | AI / Backend Engineers | Embeddings, anti-duplicate threshold, prompt guardrails, fallback policy, cost controls |
| `docs/specs/07-design-system.md` | Frontend & UI/UX | WCAG AA light-theme tokens, responsive breakpoints, themed shadcn/ui, screen states |
| `docs/specs/08-security-threat-model.md` | Security & Privacy | STRIDE threat model, session hardening, HTTP headers, zero-PII AI policy |
| `docs/specs/09-testing-strategy.md` | QA & Engineering | Vitest unit/integration/red-team tests, atomic quota race test, Playwright E2E (incl. responsive) |
| `docs/specs/10-deployment-and-ops.md` | DevOps & FinOps | GitHub Actions CI, Vercel + managed Postgres, Docker self-host, production checklist, cost tiers |
| `docs/specs/11-roadmap-and-execution-plan.md` | Engineering & Antigravity | Phase 0–5 build roadmap, Antigravity prompts, post-MVP FYP-MS plan |
| `docs/academic/fyp-defense-script.md` | Student / FYP Panel | 10-minute defense script + technical viva Q&As (excluded from agent build context) |
| `docs/academic/cv-bullets.md` | Career / Portfolio | ATS-ready resume and portfolio bullets (excluded from agent build context) |

---

## 4. Quick Local Setup

1. Copy `.env.example` to `.env.local`. Set `AUTH_SECRET` to a random value of at least 32 characters (`openssl rand -base64 32`). All other provider keys are optional for local development.
   - Without Docker/PostgreSQL, the app runs on a built-in local fallback store written to the OS temp directory (`projectcompass-local-accounts-db-v2.json`, `projectcompass-local-institutional-db-v2.json`) so writes never trigger `next dev` reloads. A 120ms reachability probe in `src/lib/db.ts` fails fast instead of stalling when Postgres is offline.
   - Without an LLM/embedding key, deterministic 1536-dim embeddings and the `COMPLETED_FALLBACK` path are used.
2. *(Optional)* Start local PostgreSQL 16 with `pgvector`:
   ```bash
   docker compose up -d db
   ```
3. Install dependencies, validate the Prisma schema, and seed the 62 canonical skills + 42 archetypes:
   ```bash
   pnpm install
   pnpm prisma validate
   pnpm prisma generate
   pnpm db:seed
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```
5. Open `http://localhost:3000/sign-up` and register with any IT program and batch, e.g. `B22F0512IT673` (decoded as `Bachelor · Fall 2022 · BSIT · Roll #673`), or sign in at `/sign-in`.

> [!IMPORTANT]
> The seed creates **local demo accounts** (one student, one supervisor, one coordinator, one admin) used by the automated E2E tests; see `src/lib/auth/account-registry.ts`. Their PINs are for local development and CI only — **never seed demo accounts into a production database**, and rotate any account created with a demo PIN.

6. Run the full verification gate:
   ```bash
   pnpm typecheck   # tsc --noEmit
   pnpm lint        # eslint . --max-warnings=0
   pnpm test        # Vitest: 7 suites / 30 tests
   pnpm test:e2e    # Playwright: 3 specs (golden path, RBAC, multi-batch + responsive)
   pnpm build
   ```

---

## 5. Continuous Integration

Every push and pull request to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) against a live `pgvector/pgvector:pg16` service container: Prisma validate + `db push` + seed → typecheck → zero-warning ESLint → Vitest (unit, integration, red-team) → production build → `/api/health` check → Playwright E2E. See [`docs/specs/10-deployment-and-ops.md`](docs/specs/10-deployment-and-ops.md) for deployment guidance.

---

## 6. How to Extend This Project with Antigravity

1. **Open the repo in Antigravity.** Confirm `ANTIGRAVITY_RULES.md` is at the repository root and `.antigravityignore` excludes `docs/academic/`.
2. **Never prompt to "build everything at once."** Use the sequential phase prompts in `docs/specs/11-roadmap-and-execution-plan.md`.
3. **Verify each phase gate before advancing:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, Prisma migrations, and UI contrast/responsiveness.
4. **Verify current package syntax** against official documentation before changing Tailwind CSS, shadcn/ui, Prisma, or Next.js configuration.
