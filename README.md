# ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System

**Author:** Abdullah Jan  
**System Class:** Production-Grade SaaS & Modular FYP Management System (FYP-MS) Core Module  
**Primary Stack:** Next.js (App Router), TypeScript (Strict), Tailwind CSS, custom-themed shadcn/ui, Supabase PostgreSQL (`pgvector`), Prisma ORM, Clerk Auth, Vercel AI SDK, Inngest, UploadThing, Resend, PostHog, Vercel, Docker Compose

---

## 1. What ProjectCompass Solves

Final-Year Project (FYP) selection fails at scale across universities for two opposite reasons: students either recycle generic, saturated ideas (basic e-commerce clones, hospital CRUD apps) or propose unrealistic scopes that collapse midway through the semester. Meanwhile, faculty supervisors receive misaligned proposals or become overloaded while domain-matched supervisors remain underutilized.

**ProjectCompass** is an engineering-first recommendation and planning platform—not a thin LLM prompt wrapper. It evaluates a student's verified skill profile, interests, academic background, weekly time budget, and career goal through a **3-stage hybrid engine**:

1. **Deterministic SQL Filtering & Capacity Guard:** Enforces supervisor slot availability (`activeSlots < maxSlots`), department rules, and scope-to-time feasibility before ranking begins.
2. **Semantic Similarity & Anti-Duplicate Gate (`pgvector` + Explicit Scoring):** Searches curated domain seed templates (solving Day-1 cold start) and historical department FYP archives via cosine similarity. Flags near-duplicates at similarity `>= 0.82` and computes a transparent **Explainable Feasibility Score (0–100)**.
3. **Guardrailed AI Synthesis (`Vercel AI SDK` + Zod):** Generates grounded differentiation angles, skill-gap learning plans, and week-by-week project roadmaps strictly from retrieved records—with deterministic fallbacks if the LLM provider fails.

---

## 2. Repository Documentation Map

Build specifications and academic deliverables are intentionally separated so agentic IDEs (such as Antigravity) index only executable engineering contracts and ignore presentation scripts.

| Path | Audience | Purpose |
| :--- | :--- | :--- |
| `ANTIGRAVITY_RULES.md` | Antigravity / AI Coding Agent | Mandatory architecture, UI/UX, strict TypeScript, and verification gates |
| `.antigravityignore` | Antigravity IDE | Excludes `docs/academic/` from agent code-indexing context |
| `.env.example` | Developers / DevOps | Complete environment variable specification (zero secrets committed) |
| `docs/specs/01-product-brief.md` | Product & Engineering | Vision, scope, non-goals, RBAC matrix, user stories, functional & NFRs, MVP DoD |
| `docs/specs/02-workflows.md` | Engineering | Explicit state machines, transitions, failure paths, idempotency rules |
| `docs/specs/03-architecture.md` | Architects & Engineers | System architecture, 3-stage hybrid engine math, tech comparisons, risks, repo tree |
| `docs/specs/04-database-schema.md` | Backend Engineers | Complete Prisma schema, `pgvector` HNSW SQL migrations, pooling rules, seed data |
| `docs/specs/05-api-design.md` | Full-Stack Engineers | Server Actions vs. Route Handlers boundary, Zod contracts, error taxonomy |
| `docs/specs/06-ai-policy.md` | AI / Backend Engineers | Embeddings, anti-duplicate threshold, prompt guardrails, fallback policy, cost controls |
| `docs/specs/07-design-system.md` | Frontend & UI/UX | WCAG AA light-theme tokens, Figma-to-Tailwind mapping, themed shadcn/ui, screen states |
| `docs/specs/08-security-threat-model.md` | Security & Privacy | STRIDE threat model, HTTP headers, zero-PII AI policy, data minimization |
| `docs/specs/09-testing-strategy.md` | QA & Engineering | Vitest unit/integration tests, atomic quota race test, Playwright E2E |
| `docs/specs/10-deployment-and-ops.md` | DevOps & FinOps | Vercel + Supabase pooling, Docker self-host, CI/CD, Sentry/PostHog, cost tiers |
| `docs/specs/11-roadmap-and-execution-plan.md` | Engineering & Antigravity | Phase 0–5 build roadmap, exact copy-paste Antigravity prompts, post-MVP FYP-MS plan |
| `docs/academic/fyp-defense-script.md` | Student / FYP Panel | 10-minute defense script + 15 technical viva Q&As (excluded from agent build context) |
| `docs/academic/cv-bullets.md` | Career / Portfolio | ATS-ready resume and portfolio bullets (excluded from agent build context) |

---

## 3. How to Build This Project with Antigravity

Follow this exact sequence after pushing this repository to GitHub and cloning it into Antigravity:

1. **Open the cloned repo in Antigravity.** Confirm that `ANTIGRAVITY_RULES.md` is visible at the repository root and `.antigravityignore` excludes `docs/academic/`.
2. **Never prompt Antigravity to "build everything at once."** Use the sequential phase prompts in `docs/specs/11-roadmap-and-execution-plan.md` (Phase 0 through Phase 5).
3. **Verify each phase gate before advancing:** Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and check Prisma migrations + UI contrast before starting the next phase.
4. **Verify latest stable package setup:** Before configuring Tailwind CSS, shadcn/ui, Prisma, or Next.js, verify current stable CLI/config syntax against official documentation rather than relying on outdated snippets.

---

## 4. Quick Local Setup (Once Scaffolded in Phase 0)

1. Copy `.env.example` to `.env.local` and populate required keys.
2. Start local PostgreSQL 16 with `pgvector`:
   ```bash
   docker compose up -d db
   ```
3. Install dependencies and apply Prisma schema + `pgvector` SQL migration:
   ```bash
   pnpm install
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```
4. Start the Next.js development server and Inngest local dev server in separate terminals:
   ```bash
   pnpm dev
   npx inngest-cli@latest dev
   ```
5. Verify health endpoint at `http://localhost:3000/api/health`.
