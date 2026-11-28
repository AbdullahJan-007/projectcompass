# 11 — Roadmap & Execution Status (v2.1)

## Completed Milestones

- **Phase 0 — Foundations & Schema:** Next.js 15.5 App Router, TypeScript 5.9 Strict, Tailwind CSS v4, Prisma 6.19, `pgvector` HNSW indexes, covering FK indexes (`0` unindexed FKs), and `21/21` Supabase RLS lockdown.
- **Phase 1 — Decoupled 3-Portal Auth & RBAC:** Student-only self-registration (`/sign-up`), login-only Admin-provisioned Faculty accounts, `.env`-driven Bootstrap Admin, deactivated-account blocking, self-service & Admin 4-digit PIN management (`changeOwnPin`, `resetAccountPin`), HMAC-SHA256 sessions with fail-closed `AUTH_SECRET`, and direct-redirect server-side layout guards.
- **Phase 2 — 3-Stage Hybrid Recommendation Engine & Group Linking:** Deterministic SQL capacity/effort filtering, FYP Group Partner linking (`StudentProfile.partnerRegNos`, 2–3 students), `pgvector` cosine similarity against 42 archetypes & historical archives (`>= 0.72` / `>= 0.82` duplicate detection) with Bulk CSV Archive Importer (`bulkImportArchives`), explainable 100-point feasibility math, and Google Gemini / OpenAI synthesis with `COMPLETED_FALLBACK`.
- **Phase 3 — Supervisor Matching, Direct Assignment & Execution Roadmaps:** `70/20/10` supervisor matching, atomic PostgreSQL slot locking (`activeSlots < maxSlots`) + Admin direct supervisor assignment (`assignProjectSupervisor`), PostgreSQL-persisted `ProjectRoadmap` & `RoadmapMilestone` tracking, live Islamabad (`PKT`) milestone calendar dates, Formal Proposal PDF Dossier printing, and Markdown export.
- **Phase 4 — Admin Command Center & Stitch UI Rebuild:** Full 5-tab Admin Command Center with CSV Roster & Allocation Matrix exports, Google Stitch Academic Navy design system, official SVG Astrolabe logo mark & favicon, zero-network Lucide `<AppIcon />`, single collapsible `PanelLeft` sidebar (`Ctrl+B`), live role-scoped Notification Bell, clean `Plus Jakarta Sans` + `Inter` typography, and live Pakistan (`Asia/Karachi`, PKT) clock & calendar.
- **Phase 5 — Automated QA & Production Hardening:** `31/31` Vitest tests, `3/3` Playwright E2E specs (`375px`, `768px`, `1280px+`), GitHub Actions CI, Turbopack + `optimizePackageImports`, and clean repository hygiene.

---

## Post-v2.1 Roadmap (Future Enhancements)

- Automated viva panel scheduling & external examiner rubrics.
- Institutional SSO / SAML 2.0 federation alongside University Reg No + PIN auth.
- Automated PDF thesis OCR ingestion & multi-campus department analytics.
