# Strict Engineering Rules & Portal Isolation Contract

This document defines the **non-negotiable architectural, security, isolation, and performance boundaries** for **ProjectCompass**. Every code change, Server Action, UI route, and database query must comply with these rules.

---

## 1. Strict 3-Portal Isolation Boundaries

ProjectCompass operates as **three strictly isolated portals** sharing a single normalized PostgreSQL (`pgvector`) database:

| Portal | Route Scope | Account Creation Rule | Forbidden Cross-Access |
| :--- | :--- | :--- | :--- |
| **Student Portal** | `/dashboard/profile`, `/dashboard/recommendations`, `/dashboard/supervisors`, `/dashboard/roadmaps/*` | **Public Self-Registration** at `/sign-up` (University Reg No + 4-digit PIN) | Cannot access `/dashboard/supervisor`, `/dashboard/coordinator`, or `/dashboard/admin` |
| **Faculty Supervisor Portal** | `/dashboard/supervisor` | **Login-Only** at `/sign-in`. **Zero public faculty signup.** Provisioned exclusively by Admin via `provisionFacultyAccount` (`src/actions/admin.actions.ts`). | Must NEVER see or access Student Execution Roadmaps, Student Profile Builder, or Student Recommendations |
| **Admin Command Center** | `/dashboard/admin`, `/dashboard/coordinator` | **Governance-Controlled** (Last-Admin protection enforced) | Controls Faculty Hiring, Student Data Explorer, Project Oversight, Archives, Quotas, and Audit Logs |

### Mandatory Enforcement Rules
1. **Zero Public Faculty Self-Registration:**
   - `/sign-up` accepts **Students only**.
   - `registerUniversityAccount()` MUST return `FORBIDDEN` for any `accountType !== "STUDENT"`.
   - `completeOnboarding()` MUST restrict `role` strictly to `STUDENT`.
   - External/unknown users can NEVER create or log into a faculty account unless provisioned in Supabase by an Admin.
2. **Defense-in-Depth Route Guards:**
   - Every portal route group MUST enforce server-side session verification in its `layout.tsx` (`profile/layout.tsx`, `recommendations/layout.tsx`, `supervisors/layout.tsx`, `roadmaps/layout.tsx`, `supervisor/layout.tsx`, `coordinator/layout.tsx`, `admin/layout.tsx`).
   - Client sidebar filtering (`AppShell`) is strictly UX ergonomics — never the security boundary.
3. **Zero Cross-Account Client Leakage:**
   - `clearWorkspaceStorage()` (`src/lib/workspace-store.ts`) MUST execute on every sign-out so zero student `localStorage` data survives account switches on shared devices.

---

## 2. Database Integrity & Fail-Closed Persistence Rules

1. **Never Swallow Production Database Errors:**
   - In `NODE_ENV === "production"`, NO Server Action may catch a Prisma write failure and return `{ ok: true }`.
   - Every write (`upsertStudentProfile`, `upsertSupervisorProfile`, `provisionFacultyAccount`, `createArchiveRecord`) MUST verify persisted rows/IDs before returning `{ ok: true }`, and return `{ ok: false, error }` with an actionable user message on failure.
2. **Never Write Optimistically to `localStorage` Before Server Verification:**
   - Client caches may only be updated *after* the Server Action confirms `res.ok === true`.
3. **Production Session Signing Fail-Closed:**
   - `src/lib/auth/token-signer.ts` MUST throw a fatal error in production if `AUTH_SECRET` is missing, shorter than 16 characters, or a placeholder.
4. **Local-Only Demo Data:**
   - Production Supabase & Vercel deployments contain ONLY the reference catalog (`Department`, `Skill`, `SeedIdeaTemplate`, `MarketTrendSnapshot`) and real user data. Demo data requires `SEED_DEMO_DATA=true` in non-production environments only.
5. **Supabase Row Level Security (RLS):**
   - All `21/21` `public` tables MUST have `ENABLE ROW LEVEL SECURITY` with zero permissive `anon`/`authenticated` PostgREST policies.

---

## 3. Performance & Query Optimization Rules

1. **Zero N+1 Loops Inside Transactions:**
   - Never run `for (const item of items) { await tx.model.upsert(...) }` inside a Prisma interactive transaction. Always batch with `findMany({ where: { in } })` + `createMany({ skipDuplicates: true })`.
2. **Parallelize Independent Queries:**
   - Always use `Promise.all([...])` for independent reads (e.g., `persistRecommendationRunToDb`, `getAdminWorkspaceData`, `generateRecommendations` pre-checks).
3. **Bound All List Queries:**
   - Never run unbounded `findMany()` on growing tables (`User`, `ProjectArchive`, `RecommendedIdea`, `AuditLog`) without explicit `take` limits.
4. **Non-Blocking Save Paths:**
   - Profile save actions must complete in `< 1s` without blocking on external 25s LLM synthesis calls. Heavy LLM synthesis runs only when explicitly triggered on `/dashboard/recommendations` with `AbortSignal.timeout(25000)` and `COMPLETED_FALLBACK` resilience.
5. **Prisma Singleton Reuse:**
   - `src/lib/db.ts` caches `globalForPrisma.prisma = db` across warm serverless invocations.

---

## 4. Verification Gate (Mandatory Before Every Push)

```bash
pnpm typecheck   # tsc --noEmit (0 errors)
pnpm lint        # eslint . --max-warnings=0 (0 errors, 0 warnings)
pnpm test        # Vitest unit, integration & security penetration suites
pnpm build       # Next.js 15.5 production build
```
