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
  - Verifies exact decoding of `B23F0184CS042` (Bachelor, Batch `2024`, Intake `Fall`, Serial `0184`, Department `BSCS`, Roll `042`) and varied cohorts/departments (`B23S1042SE018`, `B25F0911AI004`).
  - Verifies rejection of malformed Reg Nos, Faculty Email/Handle parsing, SHA-256 4-digit PIN hashing, and pre-seeded `StudentAccount` / `FacultyAccount` database records.
- **Seed Catalog & Deterministic 1536-Dim Embeddings (`seed-and-embeddings.test.ts`):**
  - Verifies 62 canonical skills, 42 curated CS archetypes, 12 market trends (`2026-Q4`), 5 demo supervisors, 10 historical archives, and normalized 1536-dim cosine similarity invariance.
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

### Layer 3: End-to-End Tests (Playwright — `tests/e2e/golden-path.spec.ts`)
- **Student Golden Path:** Landing portal -> University Reg No (`B23F0184CS042`) + 4-digit PIN (`0184`) sign-in -> verify auto-decoded `BSCS` badge -> Student Skill Profile -> 3-Track Recommendations -> verify 4-factor score breakdown & `>= 0.82` duplicate banner -> shortlist toggle toast -> generate 24-week roadmap -> verify Markdown export.
- **Coordinator Archive Path:** Navigate to `/dashboard/coordinator` -> verify past project archives, department supervision slot capacity, and `NEEDS_MANUAL_ABSTRACT` remediation state.

---
