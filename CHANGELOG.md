# Changelog

All notable changes to ProjectCompass are documented here.

## 2026-11-27 — v2.0.0: Stitch Academic Navy Rebuild, Live Islamabad PKT, SVG Brand & Repo Cleanup

### Added
- **Google Stitch Academic Navy UI Rebuild:** Rebuilt all 8 primary platform screens (`/`, `/sign-in`, `/sign-up`, `/dashboard/recommendations`, `/dashboard/supervisors`, `/dashboard/roadmaps/[id]`, `/dashboard/supervisor`, `/dashboard/admin`) plus `profile`, `coordinator`, and `market-trends` with cohesive Academic Navy (`#112D4E` / `#3F72AF` / `#71C9CE` / `#F9F7F7`) tokens.
- **Official SVG Astrolabe Logo & Favicon:** Integrated the Stitch `ProjectCompass Minimal Icon-Only Mark` as `public/projectcompass-logo.svg`, `src/app/icon.svg`, and `<ProjectCompassLogo />` across all headers and footers.
- **Single Collapsible `PanelLeft` Sidebar:** Upgraded `AppShell` with a smooth collapsible desktop sidebar (`PanelLeftClose` inside sidebar when open; single `PanelLeft` expand button in top bar when hidden), synchronized zero-overlap padding, `localStorage` persistence, and `Ctrl+B` / `Cmd+B` keyboard shortcut.
- **Zero-Network Inline SVG `<AppIcon />`:** Replaced all 142 external `material-symbols-outlined` spans with inline `lucide-react` SVGs so broken icon ligatures can never appear.
- **Live Pakistan, Islamabad (`Asia/Karachi`, PKT / UTC+5) Time & Calendar Engine:** Added `src/lib/time/pakistan-time.ts` and live ticking `<PakistanClock />` across AppShell, Landing, Sign-In, Sign-Up, Admin/Coordinator default archive years, PKT audit trail timestamps, and live roadmap milestone calendar date ranges.
- **PostgreSQL Roadmap Persistence:** Persisted `ProjectRoadmap` and `RoadmapMilestone` status transitions atomically in PostgreSQL with strict student ownership checks.
- **Custom Bootstrap Admin via `.env`:** Added `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PIN` support across `prisma/seed.ts` and `src/lib/auth/account-registry.ts`.
- **Performance & Cache Hygiene:** Enabled `optimizePackageImports` in `next.config.ts` and added self-unregistering `public/sw.js` + `<SwCleanup />` to prevent stale browser service worker caching on localhost.

### Changed
- **Typography Overhaul:** Replaced slashed-zero `JetBrains Mono` / Consolas across the entire project with clean `Plus Jakarta Sans` + `Inter` (`tabular-nums`).
- **Database Rebuild & Hardening:** Rebuilt live Supabase PostgreSQL 17 with covering FK indexes (`0` unindexed foreign keys), `3` `pgvector` HNSW indexes, `21/21` RLS lockdown, and clean reference-only seeding (zero dummy students/supervisors/archives in production).
- **Direct Role Redirects:** Updated portal `layout.tsx` guards so unauthorized cross-role visits redirect directly to the caller's role home without double-hopping.

### Removed
- Removed obsolete/unused files from GitHub: `AUDIT_REPORT.md`, `public/.gitkeep`, `src/app/onboarding/page.tsx`, `src/lib/analytics/posthog.ts`, `src/app/api/uploadthing/route.ts`, and `src/app/api/webhooks/clerk/route.ts`.

---

## 2026-11-26 — Decoupled 3-Portal Restructure & Admin Faculty Provisioning

### Added
- **Admin Command Center (`/dashboard/admin`):** Centralized 5-tab console for **Hire & Manage Faculty** (`provisionFacultyAccount`), **Student Data**, **Projects**, **Past FYP Archives**, and **Roles & Audit Logs**.
- **Strict Server-Side Portal Route Guards:** Added student-only layouts on `/dashboard/profile`, `/dashboard/recommendations`, `/dashboard/supervisors`, and `/dashboard/roadmaps`, plus `clearWorkspaceStorage()` on sign-out.

### Security & Performance
- Disabled public faculty self-registration (`/sign-up` accepts `STUDENT` only; backend returns `FORBIDDEN` for non-student payloads).
- Eliminated N+1 per-skill SQL loops inside interactive Prisma transactions and decoupled slow external LLM calls from `Save Skill Profile`.

---

## 2026-11-25 — Production Readiness & Google Gemini AI Support

- Added provider-agnostic AI support for **Google Gemini** (`gemini-3.8-flash` & `gemini-embedding-001` at `1536` dimensions via OpenAI-compatible endpoint).
- Enforced fail-closed `AUTH_SECRET` validation in production (`src/lib/auth/token-signer.ts`) and restricted demo data strictly to local/CI (`SEED_DEMO_DATA=true` && `NODE_ENV !== "production"`).

---

## 2026-11-24 — Multi-Batch IT & Computing Coverage & Responsive Release

- Added support for all Fall/Spring intakes and all 6 IT & Computing programs (`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`), `PortalSessionProvider`, mobile/tablet responsive layouts (`375px` & `768px`), and Playwright E2E coverage.
