# 05 — API Design: Server Actions & Route Handlers Contract

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 13 (API Boundary, Typed Server Actions, Webhook Route Handlers, Error Taxonomy, Rate Limiting)

---

## 1. Strict API Boundary Rule

ProjectCompass follows Next.js App Router production best practices:

- **Internal App Mutations -> Next.js Server Actions (`src/actions/*.ts`):** All form submissions, profile updates, recommendation triggers, shortlist toggles, roadmap edits, supervision requests, and coordinator CRUD operations use Server Actions. Never build redundant `/api/*` REST routes for internal React components.
- **External System Callbacks & Probes -> Next.js Route Handlers (`src/app/api/*`):** Strictly reserved for third-party webhooks (Clerk, UploadThing, Inngest, Resend) and infrastructure health checks (`/api/health`).

---

## 2. Standard `ActionResult<T>` Contract & Error Taxonomy

Every Server Action MUST return a discriminated union — never throw raw database errors to the client.

```typescript
export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROFILE_INCOMPLETE"
  | "CONCURRENT_RUN_ACTIVE"
  | "SUPERVISOR_QUOTA_FULL"
  | "MAX_PENDING_REQUESTS"
  | "DUPLICATE_RECORD"
  | "INTERNAL_ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ActionErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

---

## 3. Complete Server Actions Catalog (`src/actions/`)

### A. University Authentication, Account Registration & Profile (`src/actions/auth.actions.ts`, `src/actions/profile.actions.ts`)

| Action Name | Allowed Roles | Input Schema (Zod) | Behavior & Side Effects |
| :--- | :--- | :--- | :--- |
| `registerUniversityAccount` | Public (Registration) | `{ accountType: "STUDENT" \| "FACULTY", fullName: string (3..80), identifier: string, pin: /^\d{4}$/, designation?, departmentCode?, facultyRole?, maxSlots?, researchDomains? }` | Validates Student Reg No (`B23F0184CS042`) or Faculty Email, hashes 4-digit PIN (`XXXX`) with SHA-256, persists `StudentAccount` or `FacultyAccount` record in DB, and sets HttpOnly session cookie. |
| `signInWithUniversityCredentials` | Public (Sign In) | `{ loginMode: "STUDENT" \| "FACULTY", identifier: string, pin: /^\d{4}$/, facultyRole? }` | Verifies Student Reg No or Faculty Email against registered DB records and SHA-256 PIN hash; sets `projectcompass_uni_session` cookie and returns role-specific redirect path. |
| `listRegisteredUniversityAccounts` | Public / Directory | `(none)` | Returns non-sensitive directory of registered `StudentAccount` and `FacultyAccount` database records (excluding `pinHash`). |
| `signOutUniversitySession` | Any authenticated | `(none)` | Clears `projectcompass_uni_session` cookie and revalidates workspace routes. |
| `completeOnboarding` | Any authenticated | `{ role: "STUDENT" \| "SUPERVISOR", departmentId: cuid, cohortId?: cuid }` | Assigns department/cohort; prevents self-escalation to `COORDINATOR` or `ADMIN`. |
| `upsertStudentProfile` | `STUDENT` | `{ skills: Array<{ skillSlug, displayName, proficiency }> (min 3, max 25), interests: string[] (min 1, max 6), careerGoal: string (3..120), preferredType, weeklyHours (5..45), durationWeeks (12..36), teamSize (1..3), gpaBand? }` | Upserts normalized skills, sets status `READY`, generates/updates 1536-dim `profileEmbedding`, persists to institutional DB store, revalidates `/dashboard/profile`. |

### B. Recommendations (`src/actions/recommendation.actions.ts`)

| Action Name | Allowed Roles | Input Schema (Zod) | Behavior & Side Effects |
| :--- | :--- | :--- | :--- |
| `generateRecommendations` | `STUDENT`, `COORDINATOR` (test), `ADMIN` (test) | `{ focusNote?: string (max 240 chars) }` | Enforces `READY` profile, `max 5 runs/24h`, no active `RUNNING` run; executes 3-stage hybrid engine; persists `RecommendationRun` + 3 `RecommendedIdea` + `IdeaSkillGap` + `SupervisorMatch`; returns `{ runId, status, usedFallback }`. |
| `updateIdeaStatus` | `STUDENT` | `{ ideaId: cuid, status: "SHORTLISTED" \| "DISMISSED" \| "GENERATED" }` | Verifies ownership via `run.studentProfile.userId`; rejects changes if idea is `SUPERVISOR_LOCKED`. |

### C. Supervisor Matching & Requests (`src/actions/supervisor.actions.ts`)

| Action Name | Allowed Roles | Input Schema (Zod) | Behavior & Side Effects |
| :--- | :--- | :--- | :--- |
| `upsertSupervisorProfile` | `SUPERVISOR`, `COORDINATOR`, `ADMIN` | `{ title, bio (30..1000), researchDomains (1..8), preferredStacks (1..12), skillSlugs (1..20), maxSlots (0..15), isAccepting: boolean }` | Updates supervisor profile, regenerates `profileEmbedding`, rejects setting `maxSlots < activeSlots`. |
| `createSupervisionRequest` | `STUDENT` | `{ recommendedIdeaId: cuid, supervisorProfileId: cuid, studentPitch: string (40..1000) }` | Checks `pendingRequests < 3`, supervisor same department & `activeSlots < maxSlots`, unique `(ideaId, supervisorId)`; creates `PENDING` request + queues Resend email. |
| `withdrawSupervisionRequest` | `STUDENT` | `{ requestId: cuid }` | Ownership check; transitions `PENDING -> WITHDRAWN`. |
| `respondToSupervisionRequest` | `SUPERVISOR`, `COORDINATOR` | `{ requestId: cuid, decision: "ACCEPT" \| "DECLINE", supervisorNote: string (10..600) }` | On `ACCEPT`: runs atomic PostgreSQL conditional increment (`activeSlots < maxSlots`), locks idea, auto-withdraws other student pending requests, sends Resend email. On `DECLINE`: records feedback + emails student. |

### D. Project Roadmaps (`src/actions/roadmap.actions.ts`)

| Action Name | Allowed Roles | Input Schema (Zod) | Behavior & Side Effects |
| :--- | :--- | :--- | :--- |
| `generateProjectRoadmap` | `STUDENT` | `{ recommendedIdeaId: cuid, regenerate?: boolean }` | Verifies idea ownership; computes deterministic `prepWeeks` & 4 phase buckets totaling exact `durationWeeks`; uses LLM (with deterministic fallback) to populate concrete deliverables & risk checkpoints; persists `ProjectRoadmap` + `RoadmapMilestone[]`. |
| `toggleMilestoneStatus` | `STUDENT` | `{ milestoneId: cuid, status: MilestoneStatus }` | Verifies ownership; updates milestone status; revalidates roadmap view. |
| `exportRoadmapMarkdown` | `STUDENT`, `SUPERVISOR` (shared), `COORDINATOR` | `{ roadmapId: cuid }` | Returns formatted, clean Markdown string ready for download or GitHub README inclusion. |

### E. Coordinator Archive & Admin (`src/actions/archive.actions.ts`, `src/actions/admin.actions.ts`)

| Action Name | Allowed Roles | Input Schema (Zod) | Behavior & Side Effects |
| :--- | :--- | :--- | :--- |
| `createArchiveRecord` | `COORDINATOR`, `ADMIN` | `{ title, abstract (50..3000), academicYear (2010..2035), domain, techStack[], sourceFileUrl? }` | Inserts `ProjectArchive` (`PENDING_EMBEDDING`), emits `inngest.send("archive/record.created")`. |
| `retryArchiveEmbedding` | `COORDINATOR`, `ADMIN` | `{ archiveId: cuid }` | Resets `FAILED` / `NEEDS_MANUAL_ABSTRACT` (after manual abstract edit) to `PENDING_EMBEDDING` and re-emits Inngest event. |
| `deleteArchiveRecord` | `COORDINATOR`, `ADMIN` | `{ archiveId: cuid }` | Verifies department boundary; deletes record + writes `AuditLog`. |
| `updateUserRole` | `ADMIN` | `{ targetUserId: cuid, role: UserRole, departmentId?: cuid }` | Prevents self-demotion of last active `ADMIN`; updates Prisma `User` + syncs Clerk `publicMetadata.role`; writes `AuditLog`. |
| `overrideSupervisorQuota` | `COORDINATOR`, `ADMIN` | `{ supervisorProfileId: cuid, maxSlots: number, reason: string }` | Enforces `maxSlots >= activeSlots`; writes `AuditLog`. |

---

## 4. Route Handlers Specification (`src/app/api/`)

| Endpoint | Method | Auth / Verification | Responsibility |
| :--- | :---: | :--- | :--- |
| `/api/webhooks/clerk` | `POST` | Svix HMAC signature (`CLERK_WEBHOOK_SIGNING_SECRET`) | Handles `user.created`, `user.updated`, `user.deleted` idempotently to keep canonical `User` table synchronized. Returns `400` on invalid signature. |
| `/api/uploadthing` | `GET`, `POST` | UploadThing middleware invoking `requireRole(["COORDINATOR", "ADMIN"])` | Restricts uploads to `application/pdf` & `text/csv`, max `10MB`; returns file URL for `ProjectArchive`. |
| `/api/inngest` | `GET`, `POST`, `PUT` | Inngest signing key (`INNGEST_SIGNING_KEY`) | Serves background workflows: `archiveIngestFunction`, `archiveCsvBatchFunction`, and weekly `marketTrendsRefreshFunction`. |
| `/api/webhooks/resend` | `POST` | Resend Svix signature (`RESEND_WEBHOOK_SECRET`) | Logs bounced/complained emails to Sentry/AuditLog to protect sender reputation. |
| `/api/health` | `GET` | Public (no sensitive output) | Executes lightweight `SELECT 1` + `pgvector` extension check; returns `200 { status: "ok", db: "connected" }` or `503`. |

---

## 5. Rate Limiting & Abuse Controls

- **Recommendation Runs:** Enforced in PostgreSQL (`COUNT(*) WHERE studentProfileId = $1 AND createdAt >= NOW() - INTERVAL '24 hours' AND status != 'FAILED' < 5`). No external Redis required for MVP.
- **Roadmap Generations:** Max `10` generations per student per 24 hours.
- **Supervision Requests:** Hard cap of `3` simultaneous `PENDING` requests per student.
- **Archive CSV Imports:** Max `250` rows per batch upload; Inngest fans out embedding chunks (`10` records/step) with concurrency limit `3` to avoid OpenAI/provider rate-limit bursts.
