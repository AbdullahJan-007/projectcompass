# ProjectCompass — Engineering Audit & Remediation Report

**Date:** 2026-11-25  
**Scope:** Full-Stack Performance (Supabase + Prisma + Vercel), Target Profile Persistence Integrity, and Role-Based Data Isolation (Faculty vs. Student)  
**Target Stack:** Next.js 15.5 App Router · Prisma ORM 6.19 · Supabase PostgreSQL 17 (`pgvector`, `ap-northeast-1`, PgBouncer Transaction Pooler `:6543`) · Vercel Serverless

---

## Executive Summary

A full-codebase audit across layouts, client components, Server Actions, Prisma client initialization, and Supabase PostgreSQL schema/RLS uncovered exact, reproducible root causes for all three reported production issues:

| Issue | Severity | Primary Root Cause(s) |
| :--- | :---: | :--- |
| **1. Severe Latency Across Pages** | **P0** | (a) N+1 sequential `for` loop (`2` SQL queries/skill inside an interactive `$transaction`) in `upsertStudentProfile()` amplified by cross-region RTT (`iad1` Vercel → `ap-northeast-1` Supabase, ~180–220ms/RTT).<br>(b) `upsertStudentProfile()` synchronously blocks on external Gemini embedding + full LLM recommendation synthesis (`25s` timeout + `1.5s` retry) before returning `"Saved"`, exceeding Vercel Hobby's 10s limit.<br>(c) Sequential `findMany` lookups in `persistRecommendationRunToDb()` instead of `Promise.all()`.<br>(d) `globalForPrisma.prisma` was not cached in `NODE_ENV === "production"` (`src/lib/db.ts:116`). |
| **2. Profile Shows "Saved" But Fails Silently on Some Devices** | **P0** | (a) `src/actions/profile.actions.ts:237-303` wraps the entire `db.$transaction(...)` in a silent `catch {}` block that swallows PostgreSQL timeouts, PgBouncer transaction resets, and constraint errors, then still returns `{ ok: true }`.<br>(b) `src/app/dashboard/(compass)/profile/page.tsx:266` writes optimistically to `localStorage` *before* the DB write succeeds, and displays a green `"Saved"` toast regardless.<br>(c) Identical silent `catch {}` error swallowing exists in `upsertSupervisorProfile()` (`src/actions/supervisor.actions.ts:112`). |
| **3. Student Execution Roadmaps in Faculty Dashboard** | **P0** | (a) `src/components/layout/app-shell.tsx:52-57` explicitly includes `"SUPERVISOR"` in `NAV_ITEMS` for `"Execution Roadmaps"` (`/dashboard/roadmaps`).<br>(b) No server-side route guard exists for `/dashboard/(compass)/roadmaps` (and `/dashboard/(compass)/roadmaps/page.tsx:4` blindly redirects any role to `/dashboard/roadmaps/cm0idea_core_safe_1`).<br>(c) `handleSignOut()` (`src/components/layout/app-shell.tsx:114-118`) never clears `localStorage` keys in `src/lib/workspace-store.ts`, leaking student roadmap milestones and ideas across account switches on shared devices. |

---

## Issue 1: Page-by-Page Supabase Performance & Latency Audit

### A. Authentication & Account-Type Overhead
- **Session Verification (`src/lib/auth/session.ts:32-54` & `src/app/dashboard/layout.tsx:12-18`):**
  - **Finding (Good):** University institutional sessions use an **HMAC-SHA256 signed `HttpOnly` cookie** (`projectcompass_uni_session`) verified purely in memory via `verifySessionToken()` (`crypto.timingSafeEqual`). It performs **zero** database or external Auth round-trips per request.
  - **Finding (Prisma Singleton Bug — `src/lib/db.ts:116-118`):**
    ```ts
    if (env.NODE_ENV !== "production") {
      globalForPrisma.prisma = db;
    }
    ```
    In production serverless warm containers, `globalThis.prisma` was not assigned, risking extra Prisma client/pool instantiations across module reloads.
- **No `src/middleware.ts`:** Static assets and prefetches incur zero middleware DB overhead.

### B. Page-by-Page Query & Network Waterfall Breakdown

| Route / Page | File | Queries Executed on Load / Submit | Bottlenecks Detected | Impact |
| :--- | :--- | :--- | :--- | :---: |
| `/dashboard/profile` (Load) | `src/app/dashboard/(compass)/profile/page.tsx` → `getActiveStudentProfile()` (`profile.actions.ts:110-160`) | 1× `db.studentProfile.findUnique` (`include: { skills: { include: { skill: true } } }`) | Reasonable on load (~1 RTT), but `select` pulls full `profileSummaryTxt` and timestamps unnecessarily. | Low |
| `/dashboard/profile` (Submit — **CRITICAL**) | `upsertStudentProfile()` (`profile.actions.ts:230-355`) | 1. `generateTextEmbedding()` (external Gemini HTTP)<br>2. `$transaction`: `studentProfile.upsert` + `studentSkill.deleteMany` + **N× (`skill.upsert` + `studentSkill.create`)** + `$executeRaw`<br>3. `loadLiveEngineContext()` (2× `findMany`)<br>4. `executeHybridRecommendationEngine()` (external Gemini LLM `generateObject`, up to 25s + retry)<br>5. `persistRecommendationRunToDb()`: **3 sequential `findMany`** + `recommendationRun.create` | **16–22 sequential round-trips** + **2 external AI calls** inside a single Save button click! On Tokyo DB (~200ms RTT), this takes **5–30 seconds** and frequently exceeds Prisma's 5s interactive transaction timeout or Vercel's 10s serverless limit. | **Critical (P0)** |
| `/dashboard/recommendations` (Load) | `recommendations/page.tsx:66` → `Promise.all([getActiveRecommendationsSnapshot(), getActiveStudentProfile()])` | Inside `loadLatestRecommendationRunFromDb()` (`live-context.ts:255-315`): `studentProfile.findUnique` → then `Promise.all([recommendationRun.count, recommendationRun.findFirst])`, PLUS duplicate `studentProfile.findUnique` in `getActiveStudentProfile()` | **Duplicate `studentProfile` query** on every mount (queried twice in parallel across two Server Actions). | Medium |
| `/dashboard/recommendations` (Run) | `generateRecommendations()` (`recommendation.actions.ts:103-230`) | `studentProfile.findUnique` → `recommendationRun.updateMany` → `recommendationRun.count` (active) → `recommendationRun.count` (daily) → `loadLiveEngineContext()` → LLM → `persistRecommendationRunToDb()` (3 sequential `findMany` + `create`) | 3 sequential pre-checks + 3 sequential `findMany` in `persistRecommendationRunToDb()` (~1.4s wasted in pure sequential RTT). | High |
| `/dashboard/supervisors` (Load) | `supervisors/page.tsx:76` → `Promise.all([getStudentSupervisorsWorkspace(), getActiveRecommendationsSnapshot()])` | Parallelized `supervisorProfile.findMany` + `supervisorRequest.findMany` + `loadLatestRecommendationRunFromDb()` | Clean parallelization; narrows to single-pass once `live-context.ts` is optimized. | Low |
| `/dashboard/roadmaps/[id]` (Load) | `roadmaps/[id]/page.tsx:55` → `getActiveRecommendationsSnapshot()` | Loads all 3 ideas + all skill gaps + all supervisor matches just to display 1 roadmap | Over-fetching when only 1 idea is active (acceptable for 3 ideas, but must be strictly student-scoped). | Low |
| `/dashboard/supervisor` (Load & Save) | `supervisor/page.tsx` → `getFacultySupervisorWorkspace()`, `upsertSupervisorProfile()` | Load: `supervisorProfile.findUnique` → `supervisorRequest.findMany` (2 sequential RTTs). Save: **N+1 `for` loop** (`tx.skill.upsert` + `tx.supervisorSkill.create`) inside `$transaction` + external `generateTextEmbedding()`. | Same N+1 inside `$transaction` + external embedding stall on save. | High |
| `/dashboard/coordinator` (Load & Save) | `coordinator/page.tsx` → `getCoordinatorWorkspaceData()`, `createArchiveRecord()` | Load: `Promise.all([projectArchive.findMany, supervisorProfile.findMany])`. Save: `projectArchive.create` + inline embedding. | Good on load; `projectArchive.findMany` should include `.take(200)` upper bound. | Low |
| `/dashboard/admin` (Load) | `admin/page.tsx` → `getAdminWorkspaceData()` | `Promise.all([user.findMany, supervisorProfile.findMany, auditLog.findMany(take: 30)])` | Good parallelization; add explicit `take: 200` bound on `user.findMany`. | Low |

### C. Prioritized Remediation Plan (Issue 1)
1. **Eliminate N+1 loops & external AI blocking in `upsertStudentProfile()` and `upsertSupervisorProfile()`:**
   - Replace per-skill `tx.skill.upsert` + `tx.studentSkill.create` loops with 3 batched operations: `skill.findMany({ where: { slug: { in } } })`, `skill.createMany({ skipDuplicates: true })`, and `studentSkill.createMany(...)`.
   - Use fast deterministic embedding on profile save (sub-millisecond) and decouple heavy LLM synthesis from `Save Skill Profile` so saving completes in **< 600ms** instead of 10–30s.
2. **Parallelize `persistRecommendationRunToDb()` (`src/lib/recommendation/live-context.ts:138-183`):**
   - Wrap the 3 independent `findMany` queries (`skill`, `supervisorProfile`, `seedIdeaTemplate`) in `Promise.all(...)`.
3. **Parallelize pre-checks in `generateRecommendations()` (`src/actions/recommendation.actions.ts:139-165`):**
   - Run `activeRunningCount` and `dailyRuns` in `Promise.all(...)`.
4. **Fix Prisma Singleton Caching (`src/lib/db.ts:116`):**
   - Always assign `globalForPrisma.prisma = db` so warm Vercel serverless containers reuse the client.
5. **Add Postgres Covering Indexes & Bounds:**
   - Add indexes on `"StudentSkill"("studentProfileId")`, `"SupervisorSkill"("supervisorProfileId")`, and `"SupervisorRequest"("studentProfileId", "createdAt" DESC)`.

---

## Issue 2: Target Profile Shows "Saved" But Fails Silently on Some Devices

### Root Cause Trace (Exact File Paths & Line Numbers)

1. **Silent Database Failure Swallowing (`src/actions/profile.actions.ts:236-303`):**
   ```ts
   let profileId = `cm0profile_${user.id}`;
   try {
     const profile = await db.$transaction(async (tx) => {
       // ... 16+ sequential SQL queries over Tokyo RTT inside default 5s transaction timeout ...
     });
     profileId = profile.id;
   } catch {
     // Resilient in-memory save when running without local PostgreSQL daemon  <-- BUG!
   }
   ```
   - When the interactive `$transaction` fails on Supabase (for example: **5,000ms Prisma transaction timeout** triggered by N+1 skill upserts over Tokyo RTT, PgBouncer transaction pooler `:6543` drop, or transient mobile network interruption), the `catch` block **silently swallows the exception**!
   - Execution continues to line 326 (`if (!profileId.startsWith("cm0profile_"))`), which skips `persistRecommendationRunToDb`, and then line 365 **returns `{ ok: true, data: { profileId: "cm0profile_...", status: "READY" } }`**!
2. **Premature Optimistic `localStorage` Write (`src/app/dashboard/(compass)/profile/page.tsx:266`):**
   - `persistCurrentProfileState()` saves the form data into `window.localStorage` *before* awaiting `upsertStudentProfile(...)`.
   - Because the server returned `{ ok: true }` even when Postgres failed, line 294 displays the green success banner: `"Skill profile saved & proposals calibrated"`.
3. **Why It Reproduces Inconsistently Across Devices:**
   - On fast desktop connections with 3 skills, the N+1 transaction finishes in ~1.8s (under Prisma's 5s timeout) and persists.
   - On slower mobile networks, Safari/iOS, or when a student adds 6–10 skills (16–24 sequential queries × ~220ms RTT = **> 5,000ms**), Prisma aborts the interactive transaction with `P2028 Transaction API error: Transaction already closed`. The `catch {}` swallows it, `localStorage` caches it on that one device, and **Supabase never receives the write** — so logging in from another device shows an empty profile!
4. **Same Bug in `upsertSupervisorProfile()` (`src/actions/supervisor.actions.ts:59-115`):**
   - Wraps the Prisma `$transaction` in `catch {}` and falls through to local JSON store + returns `{ ok: true }` even in production.

### Required Fixes (Issue 2)
- **Fail Loudly in Production (Zero Silent Swallowing):** In `upsertStudentProfile()` and `upsertSupervisorProfile()`, if the Prisma write throws and `NODE_ENV === "production"` (or the error is NOT a local offline `ECONNREFUSED`), **never swallow it** — log a structured server error and return `{ ok: false, error: { code: "DATABASE_ERROR", message: "Could not save your profile to the database. Please check your connection and try again." } }`.
- **Write Verification:** After saving `StudentProfile` + `StudentSkill` rows, explicitly verify `savedProfile.id` and `insertedCount === input.skills.length` before returning `{ ok: true }`.
- **No Premature `localStorage` Persistence:** Only update client `localStorage` cache *after* `res.ok === true` is returned from the verified database write.
- **Increase Transaction Safety:** Use non-N+1 batched writes with an explicit `{ maxWait: 5000, timeout: 15000 }` transaction budget so PgBouncer + cross-region writes never hit the 5s cliff.

---

## Issue 3: Student Execution Roadmaps Appearing in the Faculty Dashboard

### Root Cause Trace (Exact File Paths & Line Numbers)

1. **Sidebar Navigation Leak (`src/components/layout/app-shell.tsx:52-57`):**
   ```ts
   {
     href: "/dashboard/roadmaps",
     label: "Execution Roadmaps",
     icon: CalendarRange,
     roles: ["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"], // <-- LEAK: SUPERVISOR included!
   },
   ```
   - Faculty Supervisors (`role === "SUPERVISOR"`) had `"Execution Roadmaps"` rendered directly in their sidebar navigation!
   - Additionally, student-only routes (`Skill & Time Profile`, `FYP Recommendations`, `Supervisor Matching`, `Execution Roadmaps`) should be strictly scoped to `["STUDENT"]` (with `Industry Demand` shared for academic reference) so Faculty, Coordinator, and Admin workspaces stay strictly role-isolated.
2. **Missing Server-Side Route Guard on `/dashboard/(compass)/roadmaps/`:**
   - `src/app/dashboard/supervisor/layout.tsx`, `coordinator/layout.tsx`, and `admin/layout.tsx` all enforce `requireRole(...)` at the layout level.
   - However, **neither `src/app/dashboard/(compass)/roadmaps/layout.tsx` nor student-route layouts existed**, and `src/app/dashboard/(compass)/roadmaps/page.tsx:4` blindly executed `redirect("/dashboard/roadmaps/cm0idea_core_safe_1")` for *any* logged-in role!
3. **Permissive Server Action Role List (`src/actions/workspace.actions.ts:442`):**
   - `getRoadmapWorkspaceData()` used `requireRole(["STUDENT", "COORDINATOR", "ADMIN"])` and `roadmaps/[id]/page.tsx` called `getActiveRecommendationsSnapshot()` (which allowed `["STUDENT", "COORDINATOR", "ADMIN"]`), never restricting student execution roadmaps strictly to `"STUDENT"` (or blocking `"SUPERVISOR"` at the route + action layer).
4. **Cross-Account `localStorage` Leakage on Logout / Role Switch (`src/components/layout/app-shell.tsx:114-118` & `src/lib/workspace-store.ts:41-45`):**
   - `handleSignOut()` called `signOutUniversitySession()` and redirected to `/sign-in` **without clearing `workspace-store.ts` keys in `localStorage`**. Switching from a Student account to a Faculty account on the same device left student milestone statuses and idea data cached in `localStorage`.

### Required Fixes (Issue 3)
- **Navigation Isolation (`src/components/layout/app-shell.tsx`):**
  - Restrict `"Skill & Time Profile"`, `"FYP Recommendations"`, `"Supervisor Matching"`, and `"Execution Roadmaps"` strictly to `roles: ["STUDENT"]` (removing `"SUPERVISOR"`, `"COORDINATOR"`, `"ADMIN"` from student execution workspaces).
- **Server-Side Route Guards:**
  - Add `src/app/dashboard/(compass)/roadmaps/layout.tsx` enforcing `session.role === "STUDENT"` (redirecting `SUPERVISOR` → `/dashboard/supervisor`, `COORDINATOR` → `/dashboard/coordinator`, `ADMIN` → `/dashboard/admin`).
  - Update `src/app/dashboard/(compass)/roadmaps/page.tsx` to check role before redirecting.
- **Backend Action Isolation:**
  - Enforce `requireRole(["STUDENT"])` in `getRoadmapWorkspaceData()` and `exportRoadmapMarkdown()`.
- **Clear Client Cache on Sign-Out & Sign-In:**
  - Add `clearWorkspaceStorage()` in `src/lib/workspace-store.ts` and invoke it in `AppShell.handleSignOut()` and upon new sign-in so zero student data ever persists across sessions.

---

## Database, Indexing & Supabase RLS Verification

- **Row Level Security (RLS):** Verified live on Supabase project `wzbqwppfaepjvnlyvixe` — **21/21** `public` tables have `ENABLE ROW LEVEL SECURITY` with zero permissive `anon`/`authenticated` PostgREST policies (preventing unauthorized REST Data API reads of `ProjectRoadmap`, `RoadmapMilestone`, `StudentProfile`, `StudentAccount`, etc., while Prisma connects via the database role).
- **Recommended Performance Indexes (applied via Supabase migration `add_fk_performance_indexes`):**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_student_skill_profile_id
    ON "StudentSkill" ("studentProfileId");

  CREATE INDEX IF NOT EXISTS idx_supervisor_skill_profile_id
    ON "SupervisorSkill" ("supervisorProfileId");

  CREATE INDEX IF NOT EXISTS idx_supervisor_request_student_created
    ON "SupervisorRequest" ("studentProfileId", "createdAt" DESC);
  ```
- **Region Recommendation (Zero-Code Latency Win):** Your Supabase database is in `ap-northeast-1` (Tokyo). In **Vercel → Project Settings → Functions → Function Region**, set the serverless region to **`hnd1` (Tokyo)** or **`sin1` (Singapore)** to reduce Vercel ↔ Supabase round-trip latency from ~200ms down to **< 15ms**!
