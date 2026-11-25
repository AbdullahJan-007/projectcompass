# 03 — System Architecture, Recommendation Engine & Tech Decisions

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 11 (System Architecture), Section 24 (Risks & Mitigations), Section 28 (GitHub Repository Structure), plus Full Tech & Tool Comparisons

---

## 1. High-Level Architectural Overview

ProjectCompass uses a **modular monolith architecture** built on Next.js App Router (deployed to Vercel) backed by a single unified relational + vector database (`Supabase PostgreSQL + pgvector` via Prisma ORM) and event-driven serverless background workflows (`Inngest`).

**Why Modular Monolith over Microservices:** At university and early-SaaS scale (`1k–50k` users), splitting the recommendation engine into a separate Python/FastAPI container introduces network latency, duplicate schema maintenance, second-host billing, and cross-service auth bugs with zero throughput gain. Keeping the hybrid engine in strict TypeScript modules (`src/lib/recommendation/`) backed by native PostgreSQL `pgvector` HNSW indexes delivers sub-100ms retrieval, ACID joins with supervisor quotas, and single-command deployments.

### Logical Layer Topology

| Layer | Responsibility | Technology & Boundary |
| :--- | :--- | :--- |
| **Presentation & Design System** | Server Components for initial fast data hydration; Client Components only for interactive forms, score charts, and roadmap toggles. | Next.js App Router, React, TypeScript (strict), Tailwind CSS, custom-themed shadcn/ui |
| **Identity & Access Adapter** | Authenticates sessions, maps external `clerkId` to canonical `User`, enforces RBAC & department boundaries. | Clerk wrapped strictly in `src/lib/auth/session.ts` |
| **Application Mutations** | Authenticated internal state changes with Zod validation and typed `ActionResult<T>` responses. | Next.js Server Actions (`src/actions/*.ts`) |
| **External Webhooks & Callbacks** | Signature-verified HTTP endpoints for external systems only. | Next.js Route Handlers (`src/app/api/*`) |
| **Hybrid Recommendation Engine** | 3-stage deterministic + semantic scoring, duplicate detection, supervisor matching, and MMR diversity ranking. | Pure TypeScript domain services (`src/lib/recommendation/*`) |
| **AI Orchestration Layer** | Embedding generation and Zod-validated structured JSON synthesis with timeout & deterministic fallback. | Vercel AI SDK (`generateObject`, `embed`) with OpenAI-compatible provider |
| **Async Background Workers** | Long-running PDF text extraction, batch archive embeddings, and scheduled market-trend refreshes. | Inngest (`/api/inngest`) |
| **Unified Data & Vector Layer** | Transactional relational records + 1536-dim cosine similarity search in one ACID engine. | Supabase PostgreSQL + `pgvector` (HNSW) via Prisma ORM |
| **Storage, Comms & Telemetry** | PDF/CSV uploads, transactional notifications, product analytics, and error tracking. | UploadThing, Resend, PostHog, Sentry |

---

## 2. Modular FYP Management System (FYP-MS) Extensibility

ProjectCompass ships as a standalone application today while maintaining clean schema and route boundaries so it becomes **Module 1 (Ideation & Matching)** of a full FYP Management System without schema rewrites:

- **Shared Core Entities:** `Department`, `Cohort`, `User`, `SupervisorProfile`, and `ProjectArchive` are modeled as institutional primitives—not recommendation-only tables.
- **Clean Extension Hooks:** `RecommendedIdea` transitions to `SUPERVISOR_LOCKED`, which exposes a stable `ideaId` foreign key that future FYP-MS tables (`ProposalSubmission`, `DefensePanel`, `MilestoneGrade`) can reference directly.
- **Route Isolation:** All MVP module routes live cleanly under `/dashboard/(compass)/*`, leaving `/dashboard/(proposals)/*` and `/dashboard/(evaluations)/*` reserved for Phase 2.

---

## 3. The 3-Stage Hybrid Recommendation Engine (Zero-Generic Design)

This is the technical heart of ProjectCompass and directly solves all six core engineering challenges: generic ideas, cold start, bias, data quality, supervisor availability, and explainability.

### Stage 1: Hard-Constraint SQL Filtering & Cold-Start Pool Assembly
1. Load student's `StudentProfile` (skills with proficiency `1..3`, interests, `weeklyHours`, `durationWeeks`, `teamSize`, `careerGoal`).
2. Calculate total effective effort budget:
   `totalEffortHours = weeklyHours * durationWeeks * teamFactor`
   where `teamFactor` is `1.0` (solo), `1.65` (pair), or `2.2` (trio — accounting for coordination overhead rather than naive linear scaling).
3. Query `SupervisorProfile` records in the student's `departmentId` strictly filtered by `isAccepting = true AND activeSlots < maxSlots`.
4. Assemble candidate project seeds from `SeedIdeaTemplate` (curated, high-rigor CS/SE archetypes ensuring Day-1 quality even when a department has zero historical uploads) filtered by domain relevance and effort ceiling (`minEffortHours <= totalEffortHours * 1.25`).

### Stage 2: Semantic Retrieval (`pgvector`), Anti-Duplicate Gate & Explainable Feasibility Formula
1. Compute (or load cached) 1536-dim embedding of the student's structured profile text.
2. Run a single `pgvector` cosine-distance query (`<=>` with HNSW index) against `SeedIdeaTemplate` to pull the top 15 semantically aligned archetypes.
3. For each candidate archetype, run a `pgvector` similarity check against `ProjectArchive` (scoped to the student's department + active archive records) to identify the top 3 closest historical FYPs:
   - `similarity < 0.72` -> `LOW_DUPLICATE_RISK`
   - `0.72 <= similarity < 0.82` -> `MODERATE_DUPLICATE_RISK` (surface past projects for inspiration/awareness)
   - `similarity >= 0.82` -> `HIGH_DUPLICATE_RISK` (mandatory differentiation angle required in Stage 3; penalty applied unless differentiated)
4. Compute the **Deterministic Explainable Feasibility Score (0–100)** using four explicit, auditable sub-scores:
   - **Skill Overlap Score (`S_skill`, weight 40%):** Weighted match between required archetype skills and student's current proficiency (`Advanced = 1.0`, `Intermediate = 0.75`, `Beginner = 0.4`, `Missing = 0.0`), normalized to `0..40`.
   - **Time-to-Complexity Fit (`S_time`, weight 30%):** Compares `totalEffortHours` (minus estimated skill-gap ramp-up hours) against the archetype's required `baseEffortHours`. Full `30` points when ratio is `>= 1.0`; smoothly decays below `1.0`, floor `0`.
   - **Resource & Data Availability (`S_resource`, weight 20%):** Deterministic score from archetype metadata (`publicDatasetAvailable`, `standardHardwareSufficient`, `noPaidApiLockin`), normalized to `0..20`.
   - **Supervisor Domain Fit (`S_sup`, weight 10%):** Best cosine similarity among currently available department supervisors (`activeSlots < maxSlots`), normalized to `0..10`. If department has no supervisors yet, defaults to neutral `6/10` with explicit UI explanation (`"Department supervisors not yet onboarded"`).
   - **Final Feasibility Score:** `round(S_skill + S_time + S_resource + S_sup)` -> guaranteed integer `0..100` with every component stored in PostgreSQL and rendered in the UI.

### Stage 3: MMR Diversity Re-Ranking & Guardrailed LLM Synthesis
1. **Anti-Bias Diversity Selection (Maximal Marginal Relevance):** Instead of returning 3 near-identical web apps, the selector picks exactly 3 distinct tracks:
   - **Track 1 (`CORE_SAFE`):** Highest Feasibility Score (`>= 72`), minimal skill-gap risk, strong supervisor match.
   - **Track 2 (`CAREER_STRETCH`):** Highest alignment with student's `careerGoal` and `MarketTrendSnapshot` high-growth stack, accepting moderate skill gap (`15–40` hrs).
   - **Track 3 (`RESEARCH_NICHE`):** Maximum vector distance from Tracks 1 & 2 (MMR diversity penalty `lambda = 0.65`) favoring novel/research-aligned problem spaces.
2. **Supervisor Load-Balancing Anti-Bias Term:** Supervisor ranking blends domain cosine similarity (`70%`), skill overlap (`20%`), and relative remaining slot capacity (`(maxSlots - activeSlots) / maxSlots`, `10%`) so popular faculty don't absorb 100% of top-1 rankings.
3. **LLM Synthesis (Grounded Only):** Vercel AI SDK `generateObject` receives the 3 selected archetypes, student profile, computed sub-scores, skill gaps, market trends, and closest past FYPs. The LLM **cannot modify numeric feasibility scores or invent supervisors**—it only writes crisp, tailored problem statements, concrete differentiation angles (if duplicate risk flagged), realistic tech-stack justifications, and tailored project titles.
4. **Deterministic Fallback:** If the LLM call fails or times out, Stage 3 falls back to structured template synthesis using the exact Stage 2 scores, skill gaps, and supervisor matches, marking the run `COMPLETED_FALLBACK`.

---

## 4. Full Technology & Dev-Tool Comparisons

Default stack components (`Next.js`, `Tailwind`, `shadcn/ui`, `Server Actions`, `Supabase PostgreSQL`, `Prisma`, `UploadThing`, `Resend`, `PostHog`, `Vercel`, `Figma`) are locked baselines. Comparisons below cover every non-default layer, scale-sensitive choice, and essential dev tool.

### A. Architecture & Infrastructure Choices

| Layer | Locked Choice | Why It Wins Here | Alternatives & Specific Weaknesses |
| :--- | :--- | :--- | :--- |
| **Vector Search** | **Supabase PostgreSQL + `pgvector` (HNSW)** | Relational filters (supervisor slots, department) and cosine similarity run in one ACID query; zero sync lag; $0 extra service cost. | **Pinecone / Qdrant:** Adds a second database to keep in sync with Prisma, complicates transactional joins on supervisor slots, and adds extra billing/latency. |
| **Authentication** | **Clerk** behind `src/lib/auth/session.ts` adapter | Ships MFA, email verification, and RBAC on Day 1; `10,000 MAU` free tier covers multiple universities; adapter eliminates lock-in. | **Custom JWT (`jose` + Argon2):** Zero per-MAU fee at 50k+ users, but requires building and auditing refresh-token rotation, email verification, password reset, and brute-force lockout manually. **Supabase Auth:** Breaks single-owner DB rule and couples auth to DB vendor. |
| **Background Jobs** | **Inngest** | Serverless-native on Vercel via `/api/inngest`; built-in retries, step functions, and cron scheduling for PDF ingestion & trend refresh; generous free tier. | **Redis + BullMQ:** Requires running a separate persistent Docker worker + managed Redis server outside Vercel, adding ops overhead and fixed monthly cost. **Raw Serverless Route:** Times out on multi-page PDF batch embedding. |
| **AI Orchestration** | **Vercel AI SDK** (OpenAI-compatible) | Provider-agnostic (`OpenAI`, `Gemini`, `Anthropic`, `OpenRouter` swap in 1 line); native Zod `generateObject` guarantees typed JSON. | **Direct single-vendor SDK:** Vendor lock-in; manual JSON parsing and retry boilerplate. **LangChain:** Heavy abstraction overhead and frequent breaking changes for simple structured pipelines. |
| **Local & Self-Host Runtime** | **Vercel (Prod) + Docker Compose (Local / On-Prem)** | Vercel gives zero-config previews and edge speed; Docker Compose provides identical local `pgvector` PostgreSQL and an escape hatch for universities requiring on-premises hosting. | **VPS-only Docker deployment:** Forces manual SSL renewal, zero-downtime deployment pipelines, DB backups, and CDN caching setup from Day 1. |
| **File Storage Strain Check** | **UploadThing** (MVP) -> **Cloudflare R2** (Trigger: `> 100GB` full thesis archives) | UploadThing gives fastest type-safe Next.js upload flow for abstract PDFs and CSVs. | **AWS S3:** Unpredictable egress fees and verbose IAM/CORS configuration. |

### B. Developer & Quality Tooling (Free-First)

| Category | Locked Tool | Why It Fits | Alternatives & Weaknesses |
| :--- | :--- | :--- | :--- |
| **Runtime Validation** | **Zod** | Single schema source for Server Actions, Route Handlers, env vars, and LLM `generateObject` outputs. | **Joi / Yup:** Weaker TypeScript static type inference; Joi adds unnecessary server-only weight. |
| **Linting & Formatting** | **ESLint (Next.js flat config) + Prettier** | Best-in-class Next.js App Router, React Hooks, and JSX accessibility (`eslint-plugin-jsx-a11y`) rules. | **Biome:** Faster single binary, but Next.js-specific and a11y lint rule coverage still trails ESLint. |
| **Unit & Integration Tests** | **Vitest** | Native ESM & TypeScript speed; ideal for verifying feasibility math, MMR ranking, and Server Action logic. | **Jest:** Slow TypeScript/ESM configuration and frequent transform friction with modern packages. |
| **End-to-End Tests** | **Playwright** | Reliable multi-role browser testing (Student vs. Coordinator RBAC), real network stubbing, and trace viewer. | **Cypress:** Slower parallel runs and weaker multi-origin auth/tab handling. |
| **Error Monitoring** | **Sentry (Free Tier)** | Captures Server Action exceptions, LLM fallback rates, and stack traces with source maps. | **Vercel runtime logs only:** Ephemeral retention, no grouped issue tracking, no alerting. |
| **CI/CD** | **GitHub Actions + Vercel Preview** | Free for public/student repos; enforces `typecheck -> lint -> vitest -> build` before merge. | **Manual deploys:** High risk of shipping broken migrations or type errors. |

---

## 5. Risks & Mitigations (Section 24)

| Risk | Likelihood | Impact | Engineering Mitigation |
| :--- | :---: | :---: | :--- |
| **LLM Hallucinates Unrealistic Tech or Fake Supervisors** | Medium | High | Supervisors and feasibility scores are computed purely in SQL/TypeScript; LLM never selects supervisors or modifies numeric scores and is constrained by strict Zod schemas. |
| **Cold-Start Poor Recommendations** | High | High | Ship `prisma/seed.ts` with 40+ curated, peer-reviewed CS/SE/AI/Security project archetypes + embeddings so Day-1 output is high-signal with zero university uploads. |
| **Popular Supervisor Overload / Bias** | High | Medium | Hard SQL filter (`activeSlots < maxSlots`), atomic PostgreSQL update on acceptance, and 10% remaining-capacity diversity weight in supervisor ranking. |
| **LLM Outage or Rate Limit During Live Demo/Defense** | Medium | High | `25s` timeout + 1 retry + automatic `COMPLETED_FALLBACK` deterministic synthesizer guarantees zero crashes even with zero internet access to LLM API. |
| **Poor Data Quality in Coordinator PDF Uploads** | High | Medium | Strict file validation, text-extraction length check (`< 100` chars -> `NEEDS_MANUAL_ABSTRACT` state), and Coordinator review UI before publishing to active archive. |
| **Clerk Pricing Strain at Multi-University Scale** | Low (MVP) / High (Scale) | Medium | Auth isolated inside `src/lib/auth/session.ts` with internal `User.id` primary keys; clean migration path to Custom JWT (`jose` + Argon2) without touching domain tables. |

---

## 6. GitHub Repository Structure (Section 28)

```text
projectcompass/
├── ANTIGRAVITY_RULES.md
├── .antigravityignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma                  # Canonical models incl. StudentAccount & FacultyAccount
│   ├── migrations/
│   │   └── 0002_pgvector_hnsw_and_constraints/migration.sql
│   ├── seed.ts                        # 62 skills + 42 CS archetypes + 12 market trends + demo dept
│   ├── local-accounts-db.json         # Persistent local DB registry for StudentAccount & FacultyAccount
│   └── local-institutional-db.json    # Persistent local DB store for profiles, runs, archives & logs
├── docs/
│   ├── specs/                         # Engineering specifications (01 through 11)
│   └── academic/                      # Defense script & portfolio summary
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Institutional landing portal
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx # University RegNo (B23F0184CS042) & Faculty 4-Digit PIN login
│   │   │   └── sign-up/[[...sign-up]]/page.tsx # Separate StudentAccount & FacultyAccount DB registration
│   │   ├── onboarding/page.tsx        # Role & cohort verification
│   │   ├── dashboard/
│   │   │   ├── layout.tsx             # Role-scoped 248px sidebar shell
│   │   │   ├── (compass)/
│   │   │   │   ├── profile/           # Student skill & capacity profile
│   │   │   │   ├── recommendations/   # 3-track hybrid recommendations & 4-factor breakdown
│   │   │   │   ├── supervisors/       # Availability-aware supervisor matching & requests
│   │   │   │   ├── roadmaps/          # Calibrated 4-phase roadmaps & .md file download
│   │   │   │   └── market-trends/     # Domain demand & stack insights (rolling "Current Benchmark")
│   │   │   ├── supervisor/            # Supervisor profile, quotas & student requests
│   │   │   ├── coordinator/           # Archive upload, ingestion status & dept quotas
│   │   │   └── admin/                 # Departments, cohorts, user roles & audit logs
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── inngest/route.ts
│   │       ├── uploadthing/route.ts
│   │       └── webhooks/
│   │           ├── clerk/route.ts
│   │           └── resend/route.ts
│   ├── actions/                       # Next.js Server Actions (internal mutations only)
│   │   ├── auth.actions.ts            # registerUniversityAccount, signInWithUniversityCredentials
│   │   ├── profile.actions.ts         # completeOnboarding, upsertStudentProfile, getActiveStudentProfile
│   │   ├── recommendation.actions.ts  # generateRecommendations, updateIdeaStatus, getActiveRecommendationsSnapshot
│   │   ├── supervisor.actions.ts      # upsertSupervisorProfile, create/withdraw/respondToSupervisionRequest
│   │   ├── roadmap.actions.ts         # generateProjectRoadmap, toggleMilestoneStatus, exportRoadmapMarkdown
│   │   ├── archive.actions.ts         # createArchiveRecord, retryArchiveEmbedding, deleteArchiveRecord
│   │   └── admin.actions.ts           # updateUserRole (last-admin guard), overrideSupervisorQuota
│   ├── components/
│   │   ├── ui/                        # Custom-themed shadcn/ui primitives (Button, Card, Badge, Select, Tabs, Dialog, etc.)
│   │   └── layout/app-shell.tsx       # 248px fixed sidebar shell with active RegNo/Faculty identity
│   ├── lib/
│   │   ├── env.ts                     # Zod-validated environment loader
│   │   ├── db.ts                      # Prisma singleton (pooled runtime client)
│   │   ├── institutional-store.ts     # Server-side persistent institutional DB synchronizer
│   │   ├── workspace-store.ts         # Client-side reactive cross-screen state store
│   │   ├── auth/
│   │   │   ├── session.ts             # Unified auth adapter (University Cookie + Clerk SSO)
│   │   │   ├── university-id.ts       # B23F0184CS042 RegNo & Faculty email parser + 4-digit PIN validator
│   │   │   └── account-registry.ts    # SHA-256 PIN hasher & StudentAccount/FacultyAccount DB persistence
│   │   ├── recommendation/
│   │   │   ├── seed-data.ts           # 62 skills, 42 CS archetypes, 12 market trends, 5 supervisors, 10 archives
│   │   │   ├── feasibility.ts         # Deterministic 4-factor score math (40/30/20/10)
│   │   │   ├── diversity.ts           # MMR 3-track selector
│   │   │   ├── duplicate-check.ts     # pgvector similarity gate (0.72 / 0.82)
│   │   │   ├── supervisor-ranker.ts   # Capacity-aware & 10% load-balance ranker
│   │   │   ├── roadmap-planner.ts     # Effort-calibrated 4-phase week allocator
│   │   │   └── engine.ts              # Full 3-stage orchestrator + COMPLETED_FALLBACK
│   │   ├── ai/
│   │   │   ├── client.ts              # Vercel AI SDK OpenAI-compatible provider
│   │   │   ├── embeddings.ts          # 1536-dim embedding helper + deterministic vector fallback
│   │   │   ├── schemas.ts             # Zod output schemas for generateObject
│   │   │   └── prompts.ts             # Grounded, XML-delimiter injection-hardened prompts
│   │   ├── inngest/
│   │   │   ├── client.ts
│   │   │   └── functions/             # archive-ingest.ts, market-trends-refresh.ts
│   │   ├── email/resend.ts
│   │   └── analytics/posthog.ts
│   └── types/
│       └── actions.ts                 # Shared ActionResult<T> & error codes
└── tests/
    ├── unit/                          # Vitest: recommendation-engine, seed-and-embeddings, university-auth
    ├── integration/                   # Vitest: rbac-onboarding, atomic-quota-and-roadmap, admin-governance
    └── e2e/                           # Playwright: golden-path.spec.ts (real browser E2E)
```
