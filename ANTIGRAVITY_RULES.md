# ANTIGRAVITY_RULES.md — Mandatory Engineering Contract for ProjectCompass

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Owner:** Abdullah Jan  
**Enforcement Level:** Strict. Every file, component, Server Action, migration, and test generated in this repository MUST comply with every rule below without exception.

---

## 1. Source-of-Truth Reading Order

Before writing code for any phase, read the exact specification files in `docs/specs/`:

1. `01-product-brief.md` (exact scope, RBAC, Non-Goals — do NOT invent features outside MVP)
2. `02-workflows.md` (state transitions and failure paths)
3. `03-architecture.md` (layer boundaries, hybrid scoring math, folder structure)
4. `04-database-schema.md` (canonical Prisma models, column names, `pgvector` index)
5. `05-api-design.md` (Server Actions vs. Route Handlers, Zod schemas, `ActionResult<T>`)
6. `06-ai-policy.md` (Vercel AI SDK structured output, guardrails, deterministic fallback)
7. `07-design-system.md` (locked WCAG AA light palette, tokens, themed shadcn/ui, states)
8. `08-security-threat-model.md` (STRIDE threat model, RBAC & privacy mitigations)
9. `09-testing-strategy.md` (Vitest unit/integration & Playwright E2E verification)
10. `10-deployment-and-ops.md` (deployment parity, CI/CD, observability & cost)
11. `11-roadmap-and-execution-plan.md` (current milestone prompt and Definition of Done)

Never read or pull implementation requirements from `docs/academic/`.

---

## 2. Locked Stack Ownership Rules (Non-Negotiable)

| Concern | Single Owner | Prohibited Pattern |
| :--- | :--- | :--- |
| **Framework** | Next.js App Router (latest stable) + React (latest stable) | Pages Router, class components, legacy `getServerSideProps` |
| **Language** | TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) | `any`, `@ts-ignore`, `@ts-expect-error`, unvalidated casts (`as Foo`) |
| **Database Access** | Prisma ORM against Supabase PostgreSQL (`pgvector`) | Supabase JS client (`@supabase/supabase-js`) for DB queries; raw SQL except typed `$queryRaw` for `pgvector` similarity |
| **Authentication** | Clerk via `src/lib/auth/session.ts` adapter | Supabase Auth; calling `auth()` directly in dozens of UI files without the adapter; client-side-only RBAC checks |
| **Internal Mutations** | Next.js Server Actions (`src/actions/*.ts`) | Creating `/api/*` REST endpoints for internal form submits or UI mutations |
| **External Callbacks** | Next.js Route Handlers (`src/app/api/*`) | Using Server Actions for Clerk, UploadThing, Inngest, or Resend webhooks |
| **Background Jobs** | Inngest (`/api/inngest`) | Long-running PDF parsing or bulk embedding loops inside synchronous Server Actions |
| **AI / LLM Calls** | Vercel AI SDK (`generateObject` + Zod) | Unvalidated raw text LLM responses; allowing LLM to invent feasibility scores or override supervisor capacity |
| **File Storage** | UploadThing | Saving uploaded PDFs to local filesystem (`public/uploads`) |
| **Email & Analytics** | Resend + PostHog | Unhandled fire-and-forget SMTP calls; leaking student PII to analytics payloads |

---

## 3. Code Quality & Zero-Vibe-Coding Standard

1. **Verify latest stable versions before installing or configuring.** Check current Tailwind CSS, shadcn/ui, Next.js, and Prisma configuration conventions; never write deprecated config syntax from memory.
2. **Exact scope only.** Implement only the active phase in `11-roadmap-and-execution-plan.md`. Zero speculative features, zero dead code, zero `TODO` placeholders, zero `console.log` statements left in production files.
3. **Every Server Action must follow the 5-step pipeline:**
   - Authenticate and verify role via `requireRole(...)`.
   - Validate input with a strict Zod schema.
   - Verify resource ownership / department boundary in PostgreSQL.
   - Execute transactional database/domain logic.
   - Return typed `ActionResult<T>` (`{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`).
4. **Trace edge cases explicitly:** Empty skill profiles, zero available supervisors in a department, duplicate project similarity `>= 0.82`, LLM API timeout/429 rate limit, malformed PDF uploads, and concurrent supervisor slot reservations must all be handled cleanly.
5. **Comments explain why, never what.** Never narrate obvious syntax.

---

## 4. UI/UX & Humanized Interface Rules

1. **Light theme is the primary surface (`#F8FAFC` base, `#FFFFFF` elevated, `#0F172A` dark ink text).** Never default to a dark-mode-first layout.
2. **Use ONLY CSS/Tailwind theme tokens defined in `docs/specs/07-design-system.md`.** Zero raw off-palette hex values in component files.
3. **Never ship default shadcn/ui look or stock AI aesthetics:**
   - Prohibited: indigo-to-purple gradients, decorative glowing/blurred blobs, emoji used as UI icons, generic centered SaaS hero boilerplate, identical card grids with no visual hierarchy, "Welcome to our platform" copy, or "Item 1 / Project A" placeholder data.
   - Required: Lucide icons with consistent stroke weight (`1.75`), clear typographic hierarchy, real CS domain sample data, intentional whitespace, and purposeful micro-transitions only for state feedback.
4. **Every data-driven screen MUST implement 4 real states:** Loading (matched skeleton), Empty (actionable guidance), Error (recoverable retry with safe message), and Populated.
5. **Explainability is mandatory in the UI:** Every recommended idea must visually display its 4-factor Feasibility Score breakdown (Skill Overlap, Time Fit, Resource Readiness, Supervisor Fit), duplicate similarity warning (if triggered), and matched supervisor availability badge.

---

## 5. Mandatory Phase Verification Gate

Before marking ANY phase complete, run and pass all checks:

1. `pnpm typecheck` (`tsc --noEmit`) — zero errors.
2. `pnpm lint` — zero warnings or errors.
3. `pnpm test` (Vitest) — all unit and integration tests pass, including edge-case tests for the active phase.
4. `pnpm prisma validate` — schema valid and migrations clean.
5. Manual or Playwright verification of happy path + empty/error/unauthorized states.
6. Confirm zero secrets hardcoded and `.env.example` updated if any new env var was added.
