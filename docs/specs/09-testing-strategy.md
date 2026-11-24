# 09 — Testing & Verification Strategy

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 18 (Unit, Integration, Concurrency & End-to-End Verification Strategy)

---

## 18. Testing & Verification Strategy

"Zero bugs" is enforced by automated verification gates across three test layers rather than manual assumptions.

### Layer 1: Unit Tests (Vitest — `tests/unit/`)
Mandatory coverage targets (`>= 90%` branch coverage on `src/lib/recommendation/` and `src/lib/auth/`):
- **Red-Team Security Penetration Suite (`security-penetration.test.ts`):**
  - Verifies rejection of raw unsigned JSON cookies, tampered base64 payload + valid signature tokens, and forged HMAC-SHA256 signatures.
  - Verifies 5-attempt 4-digit PIN brute-force lockout (`15-minute` window) and rejection of self-registration escalation to `COORDINATOR` or `ADMIN`.
- **University Registration No & 4-Digit PIN Parser (`university-auth.test.ts`):**
  - Verifies exact decoding of `B23F0184CS042` (Bachelor, Batch `2023`, Intake `Fall`, Serial `0184`, Department `BSCS`, Roll `042`) and varied cohorts/departments (`B23S1042SE018`, `B25F0911AI004`).
  - Verifies rejection of malformed Reg Nos, Faculty Email/Handle parsing, SHA-256 4-digit PIN hashing, and pre-seeded `StudentAccount` / `FacultyAccount` database records.
- **Seed Catalog & Deterministic 1536-Dim Embeddings (`seed-and-embeddings.test.ts`):**
  - Verifies 62 canonical skills, 42 curated CS archetypes, 12 market trends (`Current Benchmark`), `programCode` coverage across all 6 IT programs, 5 demo supervisors, 10 historical archives, and normalized 1536-dim cosine similarity invariance.
- **Feasibility Math (`recommendation-engine.test.ts`):**
  - Verifies exact sub-score weights (`40 + 30 + 20 + 10 = 100`).
  - Boundary checks: `0` matching skills, all `ADVANCED` skills, `weeklyHours = 5` (extreme time constraint), `teamSize = 3` (`teamFactor = 2.2`), zero supervisors in department (neutral `6/10` fallback).
- **Duplicate Thresholds (`recommendation-engine.test.ts`):**
  - Exact boundaries: `0.719 -> LOW`, `0.72 -> MODERATE`, `0.819 -> MODERATE`, `0.82 -> HIGH` with mandatory `differentiationAngle`.
- **MMR Diversity & Bias Prevention (`recommendation-engine.test.ts`):**
  - Verifies 3 distinct tracks are always selected when `>= 3` candidates exist and caps all-beginner profiles to `MODERATE`.
  - Verifies full-capacity supervisors (`activeSlots === maxSlots` or `isAccepting === false`) are excluded from primary results.
  - Verifies capacity-balance weight prevents an overloaded supervisor from always outranking an open-slot peer with equal domain fit.

### Layer 2: Integration Tests (Vitest — `tests/integration/`)
- **Atomic Quota Concurrency & Roadmap Allocator Test (`atomic-quota-and-roadmap.test.ts`):**
  - Fires two simultaneous `respondToSupervisionRequest(ACCEPT)` calls against a supervisor with `activeSlots = 4, maxSlots = 5` using `Promise.allSettled`; asserts exactly `1` succeeds (`activeSlots === 5`) and `1` fails with `SUPERVISOR_QUOTA_FULL`.
  - Verifies `sum(phase.weeks) === durationWeeks` across `12`, `16`, `24`, and `36` weeks and `0` to `80` skill-gap hours, plus Markdown export formatting.
- **RBAC & Onboarding Escalation Guard Test (`rbac-onboarding.test.ts`):**
  - Asserts self-onboarding rejects `ADMIN` or `COORDINATOR` escalation (`VALIDATION_ERROR`), blocks unauthenticated calls (`UNAUTHORIZED`), and blocks `SUPERVISOR` from mutating student skill profiles (`FORBIDDEN`).
- **Admin Governance & Last-Admin Protection Test (`admin-governance.test.ts`):**
  - Asserts the last active `ADMIN` cannot self-demote, blocks `STUDENT` from calling `createArchiveRecord` or `updateUserRole` (`FORBIDDEN`), and rejects quota overrides where `maxSlots < activeSlots`.

### Layer 3: End-to-End Tests (Playwright — `tests/e2e/golden-path.spec.ts`, 3 specs)
- **Student Golden Path:** Landing portal -> University Reg No + 4-digit PIN sign-in (clean form, no pre-filled credentials) -> verify auto-decoded program badge -> Student Skill Profile -> 3-Track Recommendations -> verify 4-factor score breakdown & `>= 0.82` duplicate banner -> shortlist toggle toast -> generate 24-week roadmap -> verify Markdown export.
- **Unauthenticated Access, Forged Cookies & RBAC:** Every `/dashboard/*` route redirects anonymous users to `/sign-in`; forged/unsigned session cookies are rejected; Coordinator role boundaries hold (no access to Admin governance).
- **Multi-Batch IT Registration & Responsive Layout:** At `375x812` (mobile) registers a fresh `Fall 2022 · BSIT` student (`B22F0512IT###`), asserts the Department of Information Technology is decoded, lands on `/dashboard/profile` with the dynamic batch label, opens the mobile navigation drawer to reach `/dashboard/recommendations`, then at `768x1024` (tablet) filters `/dashboard/supervisors` by `BSIT Faculty`. Every page asserts `document.documentElement.scrollWidth <= window.innerWidth` (zero horizontal overflow).

### Current Baseline
| Gate | Command | Result |
| :--- | :--- | :--- |
| Type safety | `pnpm typecheck` | 0 errors |
| Lint | `pnpm lint` (`--max-warnings=0`) | 0 errors / 0 warnings |
| Unit + Integration + Red-Team | `pnpm test` | 7 suites / 30 tests passing (`security-penetration` 6, `recommendation-engine` 7, `university-auth` 5, `seed-and-embeddings` 2, `atomic-quota-and-roadmap` 3, `rbac-onboarding` 4, `admin-governance` 3) |
| End-to-End | `pnpm test:e2e` | 3 / 3 specs passing |

All gates run on every push/PR via GitHub Actions (see `10-deployment-and-ops.md`).

### Local Test Reliability Notes
- When local PostgreSQL is offline, `src/lib/db.ts` runs a 120ms TCP reachability probe (also wrapping interactive `$transaction`) so tests fail over to the local fallback store in milliseconds instead of 5s Prisma connection timeouts.
- The local fallback store lives in the OS temp directory, so writes during E2E runs never trigger `next dev` Fast Refresh reloads mid-navigation.
- Prefer role-scoped Playwright locators (e.g., `getByRole("main")`, `{ exact: true }`) because the responsive shell renders the session badge and navigation links in both the sidebar/drawer and the page body.

---
