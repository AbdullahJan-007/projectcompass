# Resume / CV & Portfolio Bullet Points — ProjectCompass

**Candidate:** Abdullah Jan  
**Project:** ProjectCompass — Decoupled 3-Portal FYP Idea, Feasibility & Supervisor Recommendation Platform

---

## 1. Portfolio One-Liner (GitHub / Portfolio Card)

> **ProjectCompass** — Production-grade decoupled 3-portal FYP ideation, anti-duplicate `pgvector` archive verification, availability-aware supervisor matching, and calibrated 24-week roadmap platform engineered with Next.js 15.5 App Router, strict TypeScript, Prisma 6, Supabase PostgreSQL 17 (`pgvector` + 21/21 RLS), and Vercel AI SDK (Google Gemini / OpenAI).

---

## 2. Full-Stack Engineer CV Bullets (ATS-Optimized)

- **Architected ProjectCompass**, a decoupled 3-portal FYP platform (**Student Portal**, **Faculty Supervisor Portal**, **Admin Command Center**) using **Next.js 15.5 App Router, React 19, strict TypeScript 5.9, Tailwind CSS v4, Radix UI, Prisma ORM 6.19, and Supabase PostgreSQL 17 (`pgvector`)**.
- **Built a custom HMAC-SHA256 institutional authentication & RBAC engine (`StudentAccount` & `FacultyAccount`)** that deterministically decodes University Registration Numbers (`B23F0184CS042` → Batch, Fall/Spring Intake, Department `BSIT`–`BSDS`, Roll No) for student-only self-registration while restricting Faculty provisioning exclusively to the Admin Command Center with fail-closed `AUTH_SECRET` and deactivated-account login blocking.
- **Engineered a 3-stage hybrid recommendation engine** combining SQL capacity filtering, `pgvector` HNSW cosine similarity search across 42 curated IT & Computing archetypes, deterministic 4-factor explainable feasibility scoring (`40/30/20/10`), and Maximal Marginal Relevance (MMR) diversity ranking.
- **Hardened PostgreSQL 17 + `pgvector` for production scale** with `21/21` Row Level Security (RLS) lockdown, covering foreign-key indexes (`0` unindexed FKs), `>= 0.82` anti-duplicate archive verification via async Inngest indexing, and atomic Prisma-transaction supervisor slot locking (`activeSlots < maxSlots`).
- **Designed a resilient, provider-agnostic AI synthesis layer** via **Vercel AI SDK** (`generateObject` + Zod) supporting Google Gemini (`gemini-3.8-flash` / `gemini-embedding-001`) and OpenAI-compatible providers with prompt-injection delimiter isolation, `25s` timeout guards, and `COMPLETED_FALLBACK` resilience.
- **Delivered an Academic Navy design system & live PKT localization**, featuring a custom SVG astrolabe logo, zero-network Lucide inline SVG icons, a single collapsible `PanelLeft` sidebar (`Ctrl+B`), and live Pakistan Standard Time (Islamabad · `Asia/Karachi`) clocks and roadmap calendars.
- **Established automated QA & CI/CD gates**, pairing **31 Vitest** unit/integration/red-team security tests, **3 Playwright** real-browser E2E suites (`375px`, `768px`, `1280px+`), and GitHub Actions CI (`prisma → typecheck → lint → test → build → e2e`).

---

## 3. Compact 3-Bullet Version (For 1-Page Resume)

- **ProjectCompass (Next.js 15, TypeScript, Prisma, Supabase PostgreSQL `pgvector`, Vercel AI SDK):** Architected a decoupled 3-portal FYP recommendation and supervisor-matching platform replacing black-box LLM prompting with a 3-stage hybrid SQL + `pgvector` + deterministic feasibility engine.
- Implemented `21/21` Supabase RLS lockdown, `pgvector` HNSW anti-duplicate archive search (`>= 0.82` similarity gate), Admin-only faculty provisioning, atomic Prisma-transaction supervisor quota locking, and PostgreSQL-persisted 24-week execution roadmaps.
- Delivered WCAG 2.1 AA Academic Navy UI with collapsible navigation, live Islamabad (`PKT`) timezone integration, fail-closed HMAC-SHA256 sessions, and automated CI verification (**31 Vitest** + **3 Playwright E2E** specs).
