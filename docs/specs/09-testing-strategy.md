# 09 — Testing & Verification Strategy

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 18 (Unit, Integration, Concurrency & End-to-End Verification Strategy)

---

## 18. Testing & Verification Strategy

"Zero bugs" is enforced by automated verification gates across three test layers rather than manual assumptions.

### Layer 1: Unit Tests (Vitest — `tests/unit/`)
Mandatory coverage targets (`>= 90%` branch coverage on `src/lib/recommendation/`):
- **Feasibility Math (`feasibility.test.ts`):**
  - Verifies exact sub-score weights (`40 + 30 + 20 + 10 = 100`).
  - Boundary checks: `0` matching skills, all `ADVANCED` skills, `weeklyHours = 5` (extreme time constraint), `teamSize = 3` (`teamFactor = 2.2`), zero supervisors in department (neutral `6/10` fallback).
- **Duplicate Thresholds (`duplicate-check.test.ts`):**
  - Exact boundaries: `0.719 -> LOW`, `0.72 -> MODERATE`, `0.819 -> MODERATE`, `0.82 -> HIGH`.
- **MMR Diversity & Bias Prevention (`diversity.test.ts`, `supervisor-ranker.test.ts`):**
  - Verifies 3 distinct tracks are always selected when `>= 3` candidates exist.
  - Verifies full-capacity supervisors (`activeSlots === maxSlots` or `isAccepting === false`) are excluded from primary results.
  - Verifies capacity-balance weight prevents an overloaded supervisor from always outranking an open-slot peer with equal domain fit.
- **Roadmap Allocator (`roadmap-planner.test.ts`):**
  - Verifies `sum(phase.weeks) === durationWeeks` across edge cases (`12`, `16`, `24`, `36` weeks; `0` skill-gap hours vs. `80` skill-gap hours).

### Layer 2: Integration Tests (Vitest + Test Postgres — `tests/integration/`)
- **Atomic Quota Concurrency Test:** Fires two simultaneous `respondToSupervisionRequest(ACCEPT)` calls against a supervisor with `activeSlots = 4, maxSlots = 5` using `Promise.allSettled`; asserts exactly `1` succeeds (`activeSlots === 5`) and `1` fails with `SUPERVISOR_QUOTA_FULL`.
- **LLM Fallback Test:** Mocks AI provider `503` / timeout; asserts `generateRecommendations` returns `ok: true` with `status: "COMPLETED_FALLBACK"` and 3 valid ideas.
- **RBAC Enforcement Test:** Asserts `STUDENT` calling `createArchiveRecord` or `updateUserRole` returns `{ ok: false, error: { code: "FORBIDDEN" } }`.

### Layer 3: End-to-End Tests (Playwright — `tests/e2e/`)
- **Student Golden Path:** Sign in -> complete skill profile -> run recommendations -> verify 4-factor score breakdown & duplicate banner render -> shortlist idea -> generate roadmap -> toggle milestone -> verify Markdown export.
- **Coordinator Archive Path:** Sign in as Coordinator -> create archive record -> verify status transitions to `READY` -> verify student cannot access `/dashboard/coordinator`.

---
