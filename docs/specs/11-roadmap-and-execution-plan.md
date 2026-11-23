# 11 — Roadmap & Phased Antigravity Execution Plan

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 22 (MVP Implementation Roadmap), Antigravity Phase Prompts & Gates, Section 25 (Post-MVP & FYP-MS Expansion)

---

## 1. How to Execute This Plan in Antigravity

Do NOT ask Antigravity to build the entire repository in one prompt. Execute **Phases 0 through 5 sequentially**. Each phase has an exact scope, copy-paste Antigravity prompt, and mandatory verification gate. Never advance to Phase N+1 until Phase N's verification gate passes cleanly.

---

## 2. Phase-by-Phase Build Schedule (Section 22)

### Phase 0 — Foundation, Tooling, Database & Design System Tokens
- **Goal:** Scaffold latest stable Next.js App Router + strict TypeScript + Tailwind CSS + themed shadcn/ui + Prisma (`pgvector`) + Docker Compose local DB + Zod env validation + `/api/health`.
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/03-architecture.md`, `docs/specs/04-database-schema.md`, and `docs/specs/07-design-system.md`. Execute Phase 0 only:
  > 1. Verify latest stable setup docs for Next.js App Router, Tailwind CSS, shadcn/ui, and Prisma before generating config files.
  > 2. Scaffold the repo structure defined in `03-architecture.md` with TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`), ESLint flat config, Prettier, and Vitest.
  > 3. Configure `docker-compose.yml` (`pgvector/pgvector:pg16`), `src/lib/env.ts` (Zod), `src/lib/db.ts` (Prisma singleton), `prisma/schema.prisma`, and the custom `pgvector` HNSW + CHECK constraint SQL migration from `04-database-schema.md`.
  > 4. Configure `Plus Jakarta Sans`, `Inter`, and `JetBrains Mono` via `next/font` and wire every light-theme WCAG AA CSS/Tailwind token from `07-design-system.md` into globals and custom-themed shadcn/ui base components (`Button`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Skeleton`, `Dialog`).
  > 5. Implement `src/app/api/health/route.ts` checking DB and `pgvector` connectivity.
  > 6. Run `pnpm typecheck`, `pnpm lint`, and `pnpm prisma validate` before finishing.
- **Gate 0:** `docker compose up -d db` starts cleanly; `prisma migrate dev` succeeds with HNSW indexes; `/api/health` returns `200`; zero TS/lint errors.

### Phase 1 — Auth Adapter (Clerk), Webhooks, RBAC & Onboarding
- **Goal:** Working Clerk auth wrapped behind `src/lib/auth/session.ts`, Svix-verified Clerk webhook, Department/Cohort onboarding, and role-based dashboard shell.
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/01-product-brief.md` (Section 7 RBAC), `docs/specs/05-api-design.md`, and `docs/specs/07-design-system.md`. Execute Phase 1 only:
  > 1. Implement `src/lib/auth/session.ts` (`getCurrentUser`, `requireUser`, `requireRole`) wrapping Clerk so all business logic uses internal `User.id` and never couples directly to Clerk APIs.
  > 2. Implement `src/app/api/webhooks/clerk/route.ts` with strict Svix signature verification handling `user.created`, `user.updated`, and `user.deleted` idempotently.
  > 3. Build `/sign-in`, `/sign-up`, `/onboarding` (`completeOnboarding` Server Action restricting self-signup to `STUDENT` or `SUPERVISOR`), and the responsive light-theme App Shell (`248px` sidebar, role-filtered navigation).
  > 4. Add Vitest integration tests verifying RBAC denial (`UNAUTHORIZED`, `FORBIDDEN`) and onboarding role-escalation rejection.
  > 5. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- **Gate 1:** Auth + onboarding + role-scoped sidebar work end-to-end; RBAC tests pass.

### Phase 2 — Cold-Start Seed Catalog, Student/Supervisor Profiles & Archive Ingestion
- **Goal:** Populate 40+ curated CS seed archetypes + 12 market trends, build Student & Supervisor profile forms, and wire Coordinator archive upload (UploadThing + Inngest embedding pipeline).
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/02-workflows.md` (State Machine 3), `docs/specs/04-database-schema.md` (Section 5), `docs/specs/05-api-design.md`, and `docs/specs/07-design-system.md` (Screens 1 & 5). Execute Phase 2 only:
  > 1. Implement idempotent `prisma/seed.ts` with 60+ canonical skills, 40+ high-rigor CS/SE/AI `SeedIdeaTemplate` records, 12 `MarketTrendSnapshot` (`2026-Q4`) records, and demo department/cohort/supervisors/archives.
  > 2. Implement `src/lib/ai/embeddings.ts` (Vercel AI SDK `text-embedding-3-small`, 1536 dims, with local deterministic test-mode fallback when `AI_API_KEY` is absent in unit tests).
  > 3. Implement `upsertStudentProfile` and `upsertSupervisorProfile` Server Actions and build `/dashboard/profile` (with live effort budget calculator & readiness checklist) and `/dashboard/supervisor` profile/quota settings.
  > 4. Implement `/api/uploadthing`, `/api/inngest`, `archiveIngestFunction`, `createArchiveRecord`, `retryArchiveEmbedding`, and `/dashboard/coordinator` archive dashboard handling all 5 `ArchiveIngestStatus` states.
  > 5. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and verify `pnpm prisma db seed`.
- **Gate 2:** Seed runs cleanly; Student profile saves & embeds; Coordinator uploads PDF/manual abstract and sees `PENDING_EMBEDDING -> READY` (and `NEEDS_MANUAL_ABSTRACT` on empty PDF).

### Phase 3 — The 3-Stage Hybrid Recommendation Engine & Explainability UI
- **Goal:** Build and unit-test deterministic feasibility math, `pgvector` duplicate gate, MMR diversity selection, guardrailed Vercel AI SDK synthesis + deterministic fallback, and Screen 2 UI.
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/02-workflows.md` (State Machine 1), `docs/specs/03-architecture.md` (Section 3), `docs/specs/05-api-design.md`, `docs/specs/06-ai-policy.md`, and `docs/specs/07-design-system.md` (Screen 2). Execute Phase 3 only:
  > 1. Implement pure, unit-testable modules in `src/lib/recommendation/`: `feasibility.ts` (40/30/20/10 exact formula), `duplicate-check.ts` (`0.72` / `0.82` thresholds via `pgvector`), `diversity.ts` (MMR 3-track selector), `supervisor-ranker.ts` (capacity-guarded + 10% load-balance weight), and `engine.ts` (full 3-stage orchestrator + `COMPLETED_FALLBACK`).
  > 2. Implement `src/lib/ai/client.ts`, `schemas.ts`, and `prompts.ts` with XML delimiter prompt-injection isolation and `AbortSignal.timeout(25000)`.
  > 3. Implement `generateRecommendations` and `updateIdeaStatus` Server Actions with daily quota (`5/24h`) and concurrent-run guard.
  > 4. Build `/dashboard/recommendations` with 3-track navigation, expandable 4-factor Feasibility Score breakdown, Duplicate Risk banner + differentiation angle, Skill-Gap table, Tech Stack rationale table, Market-Trend badge, and multi-step loading progress.
  > 5. Write comprehensive Vitest unit & integration tests covering feasibility edge cases, duplicate thresholds, MMR diversity, and LLM outage fallback.
- **Gate 3:** All math/fallback Vitest suites pass (`>= 90%` coverage on `src/lib/recommendation/`); recommendations render in `< 12s` live and `< 2s` in fallback mode.

### Phase 4 — Availability-Aware Supervisor Matching, Atomic Requests & Roadmap Generator
- **Goal:** Complete the vertical slice from matched supervisor request -> atomic acceptance -> week-by-week calibrated roadmap + Markdown export + Resend notifications.
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/02-workflows.md` (State Machines 2 & 4), `docs/specs/05-api-design.md`, and `docs/specs/07-design-system.md` (Screens 3 & 4). Execute Phase 4 only:
  > 1. Implement `createSupervisionRequest`, `withdrawSupervisionRequest`, and `respondToSupervisionRequest` (with atomic PostgreSQL conditional `activeSlots < maxSlots` increment inside `prisma.$transaction`, auto-withdrawal of other pending requests on accept, and Resend email notifications).
  > 2. Implement `src/lib/recommendation/roadmap-planner.ts` (deterministic `prepWeeks` + 4-phase allocator guaranteeing `sum(weeks) === durationWeeks`), `generateProjectRoadmap`, `toggleMilestoneStatus`, and `exportRoadmapMarkdown`.
  > 3. Build `/dashboard/supervisors` (student matching & pitch modal + collapsed full-capacity section), `/dashboard/supervisor` (incoming request review + accept/decline), `/dashboard/roadmaps/[id]` (`--grad-contrast` banner, interactive timeline, Markdown export), and `/dashboard/market-trends`.
  > 4. Write Vitest integration test for concurrent last-slot acceptance (`Promise.allSettled`) proving zero over-allocation, plus unit tests for roadmap week allocation across `12/16/24/36` weeks.
- **Gate 4:** Concurrent slot race-condition test passes; emails dispatch cleanly; roadmaps export clean Markdown.

### Phase 5 — Admin Controls, Public Landing Page, Playwright E2E & Production Hardening
- **Goal:** Finalize Admin panel, humanized landing page, Sentry + PostHog wiring, security headers, Playwright E2E suite, GitHub Actions CI, and production deployment checklist.
- **Antigravity Prompt (Copy & Paste):**
  > Read `ANTIGRAVITY_RULES.md`, `docs/specs/07-design-system.md`, and `docs/specs/08-security-threat-model.md`, `docs/specs/09-testing-strategy.md`, and `docs/specs/10-deployment-and-ops.md`. Execute Phase 5 only:
  > 1. Build `/dashboard/admin` (departments, cohorts, role updates with last-admin protection, audit logs) and `/` public landing page following `07-design-system.md` (light alabaster base, real engineering preview, zero AI boilerplate).
  > 2. Wire Sentry error tracking, PostHog funnel telemetry (PII-scrubbed), `/api/webhooks/resend`, security headers in `next.config.ts`, and production `Dockerfile`.
  > 3. Create `.github/workflows/ci.yml` (`prisma validate -> typecheck -> lint -> vitest -> build`) and Playwright E2E tests in `tests/e2e/` for Student golden path and Coordinator RBAC boundary.
  > 4. Run full verification (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`) and audit every route for WCAG AA contrast, loading/empty/error states, and zero console logs or `TODO`s.
- **Gate 5:** Full CI green, Playwright E2E green, ready for Vercel + Supabase production deploy.

---

## 3. Post-MVP & FYP Management System (FYP-MS) Roadmap (Section 25)

Because core schemas (`Department`, `Cohort`, `SupervisorProfile`, `ProjectArchive`, `RecommendedIdea`) are already normalized, the following modules plug directly into ProjectCompass post-MVP:

| Phase | Module | Capabilities Added |
| :--- | :--- | :--- |
| **Phase 6 (v1.1)** | **FYP Proposal Submission & Committee Review** | Students convert `SUPERVISOR_LOCKED` ideas into formal Proposal PDFs; committee panels score proposals against institutional rubrics and issue `APPROVED` / `REVISIONS_REQUIRED`. |
| **Phase 7 (v1.2)** | **Live Milestone Tracking & Mid-Defense Evaluation** | Extends `RoadmapMilestone` with supervisor sign-offs, GitHub repo commit pulse links, and mid-term / final viva grading rubrics. |
| **Phase 8 (v1.3)** | **Institutional Analytics & Multi-Tenant SaaS** | Cross-department skill-gap heatmaps (showing curriculum gaps to faculty), institutional SSO (SAML/Google Workspace), automated LMS sync, and Stripe institutional seat billing. |
| **Phase 9 (v2.0)** | **Scale Optimization (If Needed)** | Optional swap from Clerk to Custom JWT via `src/lib/auth/session.ts` above 10k MAU; Cloudflare R2 migration if full thesis PDF archives exceed 100GB. |
