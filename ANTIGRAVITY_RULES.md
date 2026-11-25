# Engineering Standards & Architecture Contract

This document defines the mandatory engineering, security, data-integrity, and UI standards for **ProjectCompass**.

---

## 1. Architectural Invariants

1. **Deterministic Computation Before AI Synthesis:**
   - Feasibility scores (`0–100`), duplicate risk levels (`LOW` / `MODERATE` / `HIGH`), supervisor capacity guards (`activeSlots < maxSlots`), and roadmap week allocation (`sum(weeks) === durationWeeks`) are computed strictly in SQL and TypeScript.
   - Language models are restricted to grounded synthesis (problem framing, differentiation angles, rationale prose) validated against strict Zod schemas.
2. **Provider-Agnostic AI & Resilient Fallback:**
   - AI calls use the Vercel AI SDK over an OpenAI-compatible interface (supporting Google Gemini, OpenAI, and compatible endpoints) with a `25s` `AbortSignal` timeout, 1 retry, and deterministic `COMPLETED_FALLBACK` degradation.
3. **Atomic Concurrency & Quota Safety:**
   - Supervision acceptance uses conditional PostgreSQL updates (`activeSlots < maxSlots`) inside `prisma.$transaction`, reinforced by database-level `CHECK` constraints.
4. **Local-Only Demo Data:**
   - Production deployments (Vercel + Supabase) contain only the reference catalog (`Department`, `Skill`, `SeedIdeaTemplate`, `MarketTrendSnapshot`) and real user data. Demo accounts and sample archives are restricted to local/CI environments (`SEED_DEMO_DATA=true` and `NODE_ENV !== "production"`).

---

## 2. TypeScript & Code Quality Standards

- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) with zero `any` types and zero `@ts-ignore` directives.
- All Server Action and Route Handler inputs are validated with Zod (`safeParse`) and return structured `{ ok: true, data } | { ok: false, error }` results.
- All environment variables are validated through `src/lib/env.ts`; production session signing fails closed if `AUTH_SECRET` is missing or invalid.
- Zero `console.log` statements in production server code; use structured logging via `src/lib/logger.ts` with PII stripped.

---

## 3. UI/UX & Accessibility Standards

- **Design Tokens:** Use CSS custom properties defined in `src/app/globals.css` (`--bg-canvas`, `--bg-surface`, `--text-primary`, `--brand-primary`, etc.) rather than hardcoded hex colors.
- **Accessibility:** Maintain WCAG 2.1 Level AA contrast (`>= 4.5:1` text, `>= 3:1` controls), keyboard navigation, and proper ARIA attributes (`combobox` / `listbox` on `Select`, focus-visible rings on interactive elements).
- **Responsive Contract:** Every route must render cleanly at `375px` (mobile), `768px` (tablet), and `1280px+` (desktop) with zero horizontal overflow (`scrollWidth <= innerWidth`).
- **Complete Route States:** Every data-driven screen implements Loading, Empty, Error (with retry), and Populated states.

---

## 4. Verification Gate (Required Before Merging)

Every change must pass:
```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint . --max-warnings=0
pnpm test        # Vitest unit, integration & security suites
pnpm build       # Production Next.js build
pnpm test:e2e    # Playwright E2E golden-path, RBAC & responsive checks
```
