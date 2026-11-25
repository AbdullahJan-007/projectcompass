# 11 — Engineering Roadmap & Release Milestones

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Completed MVP Milestones (Phases 0–5), Production Hardening, and Post-MVP FYP-MS Roadmap

---

## 1. Release Status Summary (Phases 0–5 Completed & Verified)

All six core implementation phases are complete and verified against the automated CI pipeline:

| Verification Gate | Command | Status |
| :--- | :--- | :--- |
| **Schema & Vector Validation** | `pnpm prisma validate && pnpm prisma generate` | Passing (21 models, `pgvector` HNSW indexes, `CHECK` constraints) |
| **Type Safety** | `pnpm typecheck` (`tsc --noEmit`) | 0 errors (TypeScript 5.9 strict mode + `noUncheckedIndexedAccess`) |
| **Code Quality** | `pnpm lint` (`eslint . --max-warnings=0`) | 0 errors, 0 warnings |
| **Unit, Integration & Security** | `pnpm test` (Vitest 3.2) | 7 suites / 31 tests passing |
| **End-to-End & Responsive** | `pnpm test:e2e` (Playwright 1.65) | 3/3 specs passing (Golden Path, RBAC Security, Multi-Batch + `375px`/`768px`) |
| **Production Bundle** | `pnpm build` (Next.js 15.5) | 18/18 routes compiled cleanly |

---

## 2. Completed Implementation Phases

### Phase 0 — Foundation, Database Schema & Design Tokens
- Scaffolded Next.js 15.5 App Router with strict TypeScript, Tailwind CSS v4, ESLint flat config, and Vitest.
- Configured Zod environment validation (`src/lib/env.ts`), Prisma singleton with fast reachability circuit breaker (`src/lib/db.ts`), PostgreSQL `pgvector` HNSW migrations, and `/api/health`.
- Established WCAG 2.1 AA light-theme tokens, CSS font variables (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`), and custom-themed Radix/shadcn primitives.

### Phase 1 — Institutional Auth, RBAC & Multi-Batch Identity
- Implemented dual-mode institutional authentication (`StudentAccount` via Reg No pattern `B[YY][F/S][4-Digits][DEPT][3-Digits]` and `FacultyAccount` via university email + salted SHA-256 4-digit PIN) behind `src/lib/auth/session.ts`, alongside a Svix-verified Clerk webhook adapter.
- Built `/sign-in`, `/sign-up`, `/onboarding`, and the responsive dashboard shell with server-side RBAC layout guards across all 6 IT programs (`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`) and all Fall/Spring batches.

### Phase 2 — Reference Catalog, Profiles & Archive Ingestion
- Authored idempotent `prisma/seed.ts` with 6 IT departments, 62 canonical skills, 42 curated FYP archetypes with 1536-dim embeddings, and 12 rolling market benchmarks (with demo data strictly gated to local/CI via `SEED_DEMO_DATA=true`).
- Built Student Profile Builder (`/dashboard/profile`), Supervisor Profile & Quota settings (`/dashboard/supervisor`), and Coordinator Archive Dashboard (`/dashboard/coordinator`) with UploadThing + Inngest ingestion and `NEEDS_MANUAL_ABSTRACT` handling.

### Phase 3 — 3-Stage Hybrid Recommendation Engine
- Implemented pure, unit-tested modules in `src/lib/recommendation/`: deterministic feasibility scoring (`40/30/20/10`), `pgvector` duplicate risk gate (`0.72` / `0.82`), MMR 3-track diversity selection, and capacity-balanced supervisor ranking.
- Built provider-agnostic AI synthesis (`src/lib/ai/client.ts` & `embeddings.ts`) supporting Google Gemini and OpenAI-compatible endpoints with XML prompt-injection isolation, `25s` timeout, and `COMPLETED_FALLBACK` resilience.
- Built `/dashboard/recommendations` with expandable score breakdowns, duplicate warnings, skill-gap tables, and tech-stack rationales.

### Phase 4 — Supervisor Matching, Atomic Quotas & Roadmaps
- Implemented `createSupervisionRequest`, `withdrawSupervisionRequest`, and atomic `respondToSupervisionRequest` (conditional `activeSlots < maxSlots` inside `prisma.$transaction`, auto-withdrawing competing requests on accept).
- Implemented deterministic roadmap week allocation (`src/lib/recommendation/roadmap-planner.ts`) guaranteeing `sum(weeks) === durationWeeks` across `12`–`36` weeks, interactive milestone tracking, and Markdown export.
- Built `/dashboard/supervisors` (with IT program filter), `/dashboard/roadmaps/[id]`, and `/dashboard/market-trends`.

### Phase 5 — Governance, Security Hardening, Responsive UI & CI/CD
- Built `/dashboard/admin` governance (role updates with last-admin protection, department quotas, audit logs) and the public institutional landing portal (`/`).
- Hardened security: HMAC-SHA256 expiring sessions (`7d`), fail-closed `AUTH_SECRET` requirement in production, canonical pre-DB login rate limiting, HTML output escaping, HTTP security headers, and `21/21` Supabase RLS lockdown.
- Added mobile/tablet responsive navigation drawer, accessible custom `Select`, wrapping tabs, viewport-safe dialogs, GitHub Actions CI (`pgvector` service container + Playwright E2E), and Supabase + Vercel deployment readiness.

---

## 3. Post-MVP FYP Management System (FYP-MS) Roadmap

Because core entities (`Department`, `Cohort`, `SupervisorProfile`, `ProjectArchive`, `RecommendedIdea`) are normalized, the following modules extend ProjectCompass cleanly post-MVP:

| Release | Module | Capabilities |
| :--- | :--- | :--- |
| **v1.1** | **Proposal Submission & Committee Review** | Convert `SUPERVISOR_LOCKED` ideas into formal Proposal PDFs; panel rubric scoring (`APPROVED` / `REVISIONS_REQUIRED`). |
| **v1.2** | **Milestone Sign-Off & Mid-Defense Evaluation** | Supervisor milestone approvals, GitHub repository activity links, and mid-term / final viva grading rubrics. |
| **v1.3** | **Institutional Analytics & SSO** | Cross-department skill-gap heatmaps, university SAML / Google Workspace SSO, and LMS roster synchronization. |
| **v2.0** | **Multi-University Scale** | Dedicated multi-tenant isolation, Cloudflare R2 archive storage for large thesis corpora, and enterprise billing. |
