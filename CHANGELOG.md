# Changelog

All notable changes to ProjectCompass are documented here.

## 2026-11-26 — Decoupled 3-Portal Restructure, Admin Faculty Provisioning & Audit Remediation

### Added
- **Admin Command Center (`/dashboard/admin`):** 4-tab centralized control panel with **Hire & Provision Faculty** (`provisionFacultyAccount`), **Student Data Explorer**, **Department Projects & Supervision Oversight**, and **Role Governance & Immutable Audit Trail**.
- **Strict Server-Side Portal Route Guards:** Added student-only layouts on `/dashboard/profile`, `/dashboard/recommendations`, `/dashboard/supervisors`, and `/dashboard/roadmaps`, plus `clearWorkspaceStorage()` on sign-out to eliminate cross-account `localStorage` leakage.
- **`AUDIT_REPORT.md`:** Full evidence-based performance, silent-save, and role-isolation diagnostic report.
- **Supabase FK Indexes:** Applied `idx_student_skill_profile_id`, `idx_supervisor_skill_profile_id`, and `idx_supervisor_request_student_created`.

### Security & Breaking Boundaries
- **Disabled Public Faculty Self-Registration:** Removed Faculty tab from `/sign-up` and locked `registerUniversityAccount()` to reject any non-`STUDENT` request with `FORBIDDEN`. Faculty accounts are now provisioned exclusively by the Admin Panel.
- **Fail-Closed DB Writes:** Eliminated silent `catch {}` error swallowing in `upsertStudentProfile()` and `upsertSupervisorProfile()`, adding post-write row verification and removing premature `localStorage` writes.

### Performance
- Eliminated N+1 per-skill SQL loops inside interactive Prisma transactions (replaced with batched `findMany` + `createMany`), decoupled slow external LLM calls from `Save Skill Profile` (`< 1s` save), parallelized independent DB lookups with `Promise.all()`, and cached Prisma singleton in production.

## 2026-11-25 — Production Readiness, Gemini AI Support & Documentation Overhaul

### Added
- Provider-agnostic AI key detection supporting **Google Gemini** (`gemini-3.8-flash` & `gemini-embedding-001` at `1536` dimensions via OpenAI-compatible endpoint) alongside OpenAI and compatible providers.
- Live Supabase PostgreSQL 17 + `pgvector` schema, HNSW indexes, and `21/21` Row Level Security (RLS) lockdown.

### Security & Production Hardening
- Enforced **fail-closed `AUTH_SECRET`** validation in `src/lib/auth/token-signer.ts` when `NODE_ENV === "production"` (verified by `Exploit 7 Defense` unit test; 31/31 tests passing).
- Restricted all demo accounts, sample supervisors, and sample archives to **local/CI environments only** (`SEED_DEMO_DATA=true` and `NODE_ENV !== "production"`), keeping production Supabase & Vercel strictly on real reference catalog + real user data.

### Documentation
- Redesigned `README.md`, `ANTIGRAVITY_RULES.md`, `docs/specs/07-design-system.md`, and `docs/specs/11-roadmap-and-execution-plan.md` for crisp, production-grade engineering clarity.

## 2026-11-24 — Department-Wide, Multi-Batch & Responsive Release (`2257da8`)

### Added
- Support for **all Fall & Spring batches** — batch year and intake are decoded from any Registration Number (`B21F…`, `B22F…`, `B23S…`, `B24F…`); dynamic `batchLabel` replaces hardcoded cohort text.
- Full **Department of Information Technology & Computing** coverage: `BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS` in sign-up, onboarding, supervisor filters, coordinator archives, and admin governance.
- `programCode` on seed supervisors and an IT-program faculty filter.
- `PortalSessionProvider` / `usePortalSession()` session context for dashboard screens.
- Responsive app shell: mobile/tablet sticky header and slide-over navigation drawer.
- Playwright spec for multi-batch BSIT registration and zero horizontal overflow at `375px` and `768px`.

### Changed
- Market trends use a rolling `Current Benchmark` label instead of `2026-Q4`.
- Tabs wrap on small screens; dialogs are viewport-safe; filters go full width on mobile.
- Local fallback stores moved to the OS temp directory so writes no longer trigger `next dev` reloads.

### Fixed
- Interactive Prisma `$transaction` no longer stalls ~5s when local PostgreSQL is offline.

## 2026-11-23 — CI, Security Hardening & UI Fixes (`5f4b121`, `20f978f`)

### Added
- GitHub Actions CI with a `pgvector/pgvector:pg16` service, schema push + seed, typecheck, lint, Vitest, production build, health check, and Playwright E2E.
- `AUTH_SECRET`, 7-day session expiry, and canonical pre-DB login rate limiting.
- Custom accessible `Select` component.

### Fixed
- CI build failure caused by build-time `next/font/google` fetch and duplicate `next lint` pass.
- `Dockerfile` lockfile usage and missing `public/` directory; idempotent migration constraints.
- Black arrow artifact in native selects on Windows Chromium; dev overlay noise from offline Prisma errors.

### Security
- Removed pre-filled credentials and personal data from UI and runtime stores.
- Per-user isolation in recommendation and profile actions; `escapeHtml()` for exported content.
