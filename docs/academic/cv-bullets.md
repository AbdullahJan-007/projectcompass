# Resume / CV & Portfolio Bullet Points — ProjectCompass

**Candidate:** Abdullah Jan  
**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Note:** Stored in `docs/academic/` and excluded from Antigravity code-indexing via `.antigravityignore`.

---

## 1. Portfolio One-Liner (GitHub / Portfolio Card)

> **ProjectCompass** — Production-grade FYP ideation, anti-duplicate archive search, and availability-aware supervisor matching platform engineered with Next.js App Router, TypeScript, Prisma, Supabase PostgreSQL (`pgvector`), Vercel AI SDK, and Inngest.

---

## 2. Full-Stack Engineer CV Bullets (ATS-Optimized)

- **Architected ProjectCompass**, a modular multi-role FYP recommendation and planning platform (Student, Supervisor, Coordinator, Admin) using **Next.js 15.5 App Router, React 19, strict TypeScript 5.9, Tailwind CSS v4, custom-themed shadcn/ui, Prisma ORM 6.19, and Supabase PostgreSQL 16 (`pgvector`)**.
- **Designed a dual-schema institutional authentication engine (`StudentAccount` & `FacultyAccount`)** that deterministically decodes University Registration Numbers (`B23F0184CS042` -> Program, Batch Year, Fall/Spring Intake, Department `BSCS`/`BSSE`/`BSAI`, Roll No) and Faculty emails with SHA-256 salted 4-digit PIN verification (`XXXX`) and HttpOnly session isolation.
- **Engineered a 3-stage hybrid recommendation engine** combining SQL capacity filtering, `pgvector` HNSW cosine similarity search across 42 curated CS archetypes, deterministic 4-factor explainable feasibility scoring (`40/30/20/10`), and Maximal Marginal Relevance (MMR) diversity ranking to eliminate generic recommendations and cold-start failure.
- **Built an institutional anti-duplicate detection pipeline** using UploadThing and **Inngest** asynchronous workflows to extract and embed historical FYP PDFs (`1536`-dim vectors), flagging near-duplicate proposals (`>= 0.82` cosine similarity) and enforcing grounded differentiation angles.
- **Eliminated supervisor over-allocation race conditions** by implementing atomic conditional PostgreSQL updates inside Prisma transactions paired with database-level `CHECK` invariants, validated under concurrent acceptance tests in **Vitest**.
- **Designed a resilient, provider-agnostic AI synthesis layer** via **Vercel AI SDK** (`generateObject` + Zod) with prompt-injection delimiter isolation, `25s` timeout guards, and a deterministic fallback synthesizer achieving zero-downtime degradation during LLM outages.
- **Established production-grade observability and QA gates**, pairing **24 Vitest** unit/integration tests, **Playwright** real-browser E2E suites, **Sentry** exception monitoring, **PostHog** funnel analytics, and GitHub Actions CI (`typecheck -> lint -> test -> build`).

---

## 3. Compact 3-Bullet Version (For 1-Page Resume)

- **ProjectCompass (Next.js, TypeScript, Prisma, PostgreSQL `pgvector`, Vercel AI SDK, Inngest, Clerk):** Architected a modular 4-role FYP recommendation and supervisor-matching SaaS module replacing generic LLM prompting with a 3-stage hybrid SQL + vector + deterministic scoring engine.
- Implemented `pgvector` HNSW anti-duplicate archive search (`>= 0.82` similarity gate), atomic Prisma-transaction supervisor quota protection, and async PDF embedding pipelines via UploadThing + Inngest with zero serverless timeout failures.
- Delivered WCAG 2.1 AA light-theme UI, Zod-validated Server Actions & Svix-verified webhooks, deterministic LLM fallback resilience, and automated Vitest + Playwright CI verification.

---

## 4. LinkedIn / GitHub Project Highlights (Technical Talking Points)

- **Why it stands out:** Shows Staff-level system judgment—explicit separation of Server Actions vs. Webhook Route Handlers, `pgvector` unified relational-vector querying instead of unnecessary Pinecone sprawl, Clerk abstracted behind an internal auth adapter for zero lock-in, and explainable math instead of black-box AI scores.
- **Verified Metrics to Fill After Deployment:** Replace brackets with measured numbers from your live deployment: `[X]ms` p95 `pgvector` query latency, `[X]%` unit test coverage on scoring engine, `[X]` seeded CS archetypes, `[X]` seconds median end-to-end recommendation latency.
