# Strict Engineering Rules & Portal Isolation Contract

This document defines the **non-negotiable architectural, security, UI, timezone, and performance boundaries** for **ProjectCompass**. Every code change, Server Action, UI route, and database query must comply with these rules.

---

## 1. Strict 3-Portal Isolation Boundaries

ProjectCompass operates as **three strictly isolated portals** sharing a single normalized PostgreSQL (`pgvector`) database:

| Portal | Route Scope | Account Creation Rule | Forbidden Cross-Access |
| :--- | :--- | :--- | :--- |
| **Student Portal** | `/dashboard/profile`, `/dashboard/recommendations`, `/dashboard/supervisors`, `/dashboard/roadmaps/*` | **Public Self-Registration** at `/sign-up` (University Reg No + 4-digit PIN) | Cannot access `/dashboard/supervisor`, `/dashboard/coordinator`, or `/dashboard/admin` |
| **Faculty Supervisor Portal** | `/dashboard/supervisor` | **Login-Only** at `/sign-in`. **Zero public faculty signup.** Provisioned exclusively by Admin via `provisionFacultyAccount` (`src/actions/admin.actions.ts`). | Must NEVER see or access Student Execution Roadmaps, Student Profile Builder, or Student Recommendations |
| **Admin Command Center** | `/dashboard/admin`, `/dashboard/coordinator` | **Bootstrap Admin via `.env`** (`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PIN`, `BOOTSTRAP_ADMIN_NAME`) with Last-Admin protection | Controls Faculty Hiring, Student Data Explorer, Project Oversight, Archives, Quotas, Account Activation, and Audit Logs |

### Mandatory Enforcement Rules
1. **Zero Public Faculty Self-Registration:**
   - `/sign-up` accepts **Students only**.
   - `registerUniversityAccount()` MUST return `FORBIDDEN` for any `accountType !== "STUDENT"`.
   - `completeOnboarding()` MUST restrict `role` strictly to `STUDENT`.
   - External/unknown users can NEVER create or log into a faculty account unless provisioned in Supabase by an Admin.
2. **Deactivated Account Blocking:**
   - `signInWithUniversityCredentials()` MUST verify `User.isActive !== false` and reject deactivated accounts with `FORBIDDEN`.
3. **Defense-in-Depth Route Guards:**
   - Every portal route group MUST enforce server-side HMAC session verification in its `layout.tsx` (`profile/layout.tsx`, `recommendations/layout.tsx`, `supervisors/layout.tsx`, `roadmaps/layout.tsx`, `supervisor/layout.tsx`, `coordinator/layout.tsx`, `admin/layout.tsx`) and redirect unauthorized callers directly to their own role home without double-hopping.
4. **Zero Cross-Account Client Leakage:**
   - `clearWorkspaceStorage()` (`src/lib/workspace-store.ts`) MUST execute on every sign-out so zero student `localStorage` data survives account switches on shared devices.

---

## 2. Database Integrity & Fail-Closed Persistence Rules

1. **Never Swallow Production Database Errors:**
   - In `NODE_ENV === "production"`, NO Server Action may catch a Prisma write failure and return `{ ok: true }`.
   - Every write (`upsertStudentProfile`, `upsertSupervisorProfile`, `provisionFacultyAccount`, `resetAccountPin`, `assignProjectSupervisor`, `changeOwnPin`, `createArchiveRecord`, `bulkImportArchives`, `generateProjectRoadmap`, `toggleMilestoneStatus`) MUST verify persisted rows before returning `{ ok: true }`.
2. **Production Session Signing Fail-Closed:**
   - `src/lib/auth/token-signer.ts` MUST throw a fatal error in production if `AUTH_SECRET` is missing, shorter than 16 characters, or a placeholder.
3. **Local-Only Demo Data:**
   - Production Supabase & Vercel deployments contain ONLY the reference catalog (`Department`, `Skill`, `SeedIdeaTemplate`, `MarketTrendSnapshot`), the Bootstrap Admin from `.env`, and real user records. Demo data requires `SEED_DEMO_DATA=true` in non-production environments only.
4. **Supabase Row Level Security (RLS) & Covering FK Indexes:**
   - All `21/21` `public` tables MUST have `ENABLE ROW LEVEL SECURITY` with zero permissive `anon`/`authenticated` PostgREST policies and `0` unindexed foreign keys.

---

## 3. UI, Typography, Icons & Timezone Standards

1. **Zero External Icon Fonts:**
   - Never use `material-symbols-outlined` or external CDN icon fonts that can fail and leak raw ligature text into inputs/buttons. Always use inline `lucide-react` SVGs via `<AppIcon />` (`src/components/ui/app-icon.tsx`).
2. **Clean Non-Slashed Typography:**
   - Use `Plus Jakarta Sans` for headings and `Inter` (`font-variant-numeric: tabular-nums`) for UI text, badges, years, and numeric metrics. Never use slashed-zero monospace fonts (`JetBrains Mono` / `Consolas`) in user-facing UI.
3. **Official Brand Mark:**
   - Always render `<ProjectCompassLogo />` (`src/components/ui/project-compass-logo.tsx`) for brand headers and footers; never fall back to a plain letter box.
4. **Single Collapsible Sidebar Toggle:**
   - `AppShell` MUST display at most **one** desktop sidebar toggle button at any time (`PanelLeftClose` inside the sidebar when open; `PanelLeft` in the top bar ONLY when collapsed), with synchronized zero-overlap main container padding and `Ctrl+B` shortcut support.
5. **Live Pakistan Standard Time (Islamabad · `Asia/Karachi` · PKT):**
   - All UI clocks, academic years, archive defaults, audit trail timestamps, and roadmap phase calendar dates MUST derive dynamically from `src/lib/time/pakistan-time.ts` (`timeZone: "Asia/Karachi"`). Never hardcode static years like `2025` or raw UTC slices in UI displays.

---

## 4. Performance & Query Optimization Rules

1. **Zero N+1 Loops Inside Transactions:** Always batch with `findMany({ where: { in } })` + `createMany({ skipDuplicates: true })`.
2. **Parallelize Independent Queries:** Always use `Promise.all([...])` for independent reads.
3. **Bound All List Queries:** Never run unbounded `findMany()` on growing tables without explicit `take` limits.
4. **Non-Blocking Save Paths:** Profile saves must complete in `< 1s`; external LLM synthesis runs only on explicit recommendation generation with `AbortSignal.timeout(25000)` and `COMPLETED_FALLBACK` resilience.
5. **Fast Dev & Bundle Optimization:** Keep `optimizePackageImports` enabled in `next.config.ts` and cache Prisma singleton in `src/lib/db.ts`.

---

## 5. Verification Gate (Mandatory Before Every Push)

```bash
pnpm prisma validate  # Valid Prisma schema
pnpm typecheck        # tsc --noEmit (0 errors)
pnpm lint             # eslint . --max-warnings=0 (0 errors, 0 warnings)
pnpm test             # Vitest unit, integration & security penetration suites
pnpm build            # Next.js 15.5 production build
```
