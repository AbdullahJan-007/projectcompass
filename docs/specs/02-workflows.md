# 02 — Workflows & State Machines

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 14 (Workflows, State Machines, Failure Paths, Idempotency & Edge Cases)

---

## 1. Core End-to-End Student Journey

The primary workflow moves a student from unstructured uncertainty to an actionable, supervisor-aligned FYP plan in five deterministic stages:

1. **University Account Registration & Role Provisioning:**
   - **Student Path:** Student registers on `/sign-up` with Full Name, University Registration Number (`B23F0184CS042`), and 4-digit PIN (`XXXX`) -> system auto-extracts Batch Year (`2024`), Intake (`Fall`), Department (`BSCS`), and Roll No (`042`), persists a `User` + `StudentAccount` record in the database, and initializes `StudentProfile` in `DRAFT` (or `READY` once 3+ skills are saved).
   - **Faculty Path:** Faculty registers on `/sign-up` with Full Name, Designation, Official Email (`kamran.siddiqui@university.edu`), Department, Supervision Slot Quota, Research Domains, and 4-digit PIN (`XXXX`) -> persists `User` + `FacultyAccount` + `SupervisorProfile` records in the database.
   - **Sign-In Verification:** On `/sign-in`, credentials and 4-digit PIN hashes are verified against the registered `StudentAccount` and `FacultyAccount` database records before issuing an HttpOnly session cookie (`projectcompass_uni_session`).
2. **Profile Completion:** Student enters `>= 3` skills with proficiency levels, `>= 1` domain interest, weekly hour budget, semester duration, team size, and career goal -> Profile transitions to `READY` and generates a profile embedding vector.
3. **Hybrid Recommendation Run:** Student triggers generation -> Server Action verifies rate limit (`max 5 runs/day` per student) and `READY` profile -> creates `RecommendationRun` (`RUNNING`) -> executes SQL filters + `pgvector` search + deterministic feasibility scoring + MMR track selection + guardrailed LLM synthesis -> persists 3 `RecommendedIdea` records + `IdeaSkillGap` rows + ranked `SupervisorMatch` rows -> transitions to `COMPLETED` (or `COMPLETED_FALLBACK` if LLM failed).
4. **Shortlist & Supervisor Matching:** Student inspects score breakdowns, duplicate warnings, and market trends -> shortlists an idea (`SHORTLISTED`) -> optionally submits a structured Supervision Request (`PENDING`) to an available supervisor -> supervisor receives Resend notification and accepts (`ACCEPTED`, atomically incrementing `activeSlots`) or declines (`DECLINED` with reason).
5. **Roadmap Generation & Execution Tracking:** Student generates a personalized week-by-week roadmap for any shortlisted/accepted idea -> system calibrates ramp-up weeks from `totalSkillGapHours / weeklyHours` -> persists `ProjectRoadmap` and `RoadmapMilestone` records -> student tracks milestones and exports Markdown.

---

## 2. State Machine 1: `RecommendationRun` Lifecycle

Controls every execution of the hybrid recommendation engine and guarantees idempotency and graceful degradation.

| Current State | Trigger / Event | Guard Condition | Next State | Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| `(none)` | `generateRecommendations` Server Action | Profile is `READY`, active runs `== 0`, daily quota `< 5` | `RUNNING` | Creates `RecommendationRun` row with snapshot hash of student profile |
| `RUNNING` | Stages 1–3 succeed & Zod validates LLM JSON | All 3 tracks valid (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`) | `COMPLETED` | Persists ideas, skill gaps, supervisor matches, token usage; emits PostHog event |
| `RUNNING` | LLM timeout (`> 25s`), HTTP 429/5xx, or Zod validation fails after 1 retry | Stages 1–2 deterministic candidates exist | `COMPLETED_FALLBACK` | Synthesizes 3 structured ideas deterministically from top seed templates + real scores; logs warning to Sentry |
| `RUNNING` | Database error or zero candidates after seed fallback | Unrecoverable system failure | `FAILED` | Stores sanitized `errorCode`; allows immediate retry without consuming daily quota |
| `COMPLETED` / `COMPLETED_FALLBACK` | Student updates skills/interests significantly | Profile snapshot hash changed | `(new run allowed)` | Previous runs remain immutable in history for audit/comparison |

### Edge Cases Handled
- **Double-Click / Concurrent Submit:** Unique partial check prevents a student from spawning two simultaneous `RUNNING` runs; UI disables button and polls/awaits the active run.
- **Stale Stuck Runs:** Any `RUNNING` record older than `90 seconds` without completion is automatically marked `FAILED` (`TIMEOUT_RECOVERY`) on the next check so a user is never permanently locked out.

---

## 3. State Machine 2: `SupervisorRequest` & Atomic Quota Protection

Prevents the classic concurrency bug where two students are accepted into a supervisor's last remaining slot at the same millisecond.

| Current State | Trigger | Actor | Guard Condition | Next State | Atomic Side Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `(none)` | `createSupervisionRequest` | Student | Student active pending requests `< 3`; supervisor `isAccepting == true` and `activeSlots < maxSlots`; no existing request for same `(ideaId, supervisorId)` | `PENDING` | Creates `SupervisorRequest`; sends Resend email to supervisor |
| `PENDING` | `withdrawSupervisionRequest` | Student | Request belongs to student | `WITHDRAWN` | Frees 1 pending request slot for student |
| `PENDING` | `respondToSupervisionRequest(ACCEPT)` | Supervisor / Coordinator | Executed inside `prisma.$transaction` with atomic conditional update: `WHERE id = supervisorId AND activeSlots < maxSlots AND isAccepting = true` | `ACCEPTED` | Increments `activeSlots` by `1`; marks student's `RecommendedIdea` as `SUPERVISOR_LOCKED`; auto-withdraws student's other `PENDING` requests; emails student |
| `PENDING` | `respondToSupervisionRequest(DECLINE)` | Supervisor / Coordinator | Decline reason (`>= 10` chars) provided | `DECLINED` | Stores feedback reason; emails student with next-best matched supervisor link |
| `ACCEPTED` | `releaseSupervisionSlot` | Coordinator / Admin | Audit reason required | `RELEASED` | Atomically decrements `activeSlots` (floor `0`); writes `AuditLog`; notifies both parties |

### Concurrency Race Condition Guarantee
When Supervisor S has `activeSlots = 4` and `maxSlots = 5`, and tries to accept Student A and Student B concurrently (e.g., two browser tabs):
- PostgreSQL executes an atomic conditional update (`UPDATE supervisor_profiles SET active_slots = active_slots + 1 WHERE id = $1 AND active_slots < max_slots`).
- Exactly one transaction updates `1` row and commits `ACCEPTED`.
- The second transaction updates `0` rows, rolls back immediately, and returns typed error `SUPERVISOR_QUOTA_FULL`. Zero over-allocation is possible.

---

## 4. State Machine 3: `ProjectArchive` Ingestion Pipeline (Async via Inngest)

Handles coordinator uploads of historical FYP PDFs or CSV batches without hitting Vercel serverless timeouts.

| Current State | Trigger | Actor / Worker | Next State | Failure Handling |
| :--- | :--- | :--- | :--- | :--- |
| `(none)` | Coordinator submits manual form / CSV / PDF via UploadThing | Coordinator | `PENDING_EMBEDDING` | File type (`application/pdf`, `text/csv`) and size (`<= 10MB`) validated before upload completes |
| `PENDING_EMBEDDING` | Inngest event `archive/record.created` consumed | Inngest Worker | `PROCESSING` | Idempotency key `archiveId` prevents duplicate runs |
| `PROCESSING` | Text extracted + normalized + 1536-dim embedding generated + stored in `pgvector` | Inngest Worker | `READY` | Record becomes immediately searchable in anti-duplicate vector queries |
| `PROCESSING` | Scanned image-only PDF (no extractable text) or corrupt file | Inngest Worker | `NEEDS_MANUAL_ABSTRACT` | Surfaces clear UI badge asking coordinator to paste the 150-word abstract manually |
| `PROCESSING` | Embedding API transient error (429 / 503) | Inngest Worker | Retry (up to 3x exponential backoff) -> `FAILED` | Coordinator sees exact error reason and "Retry Embedding" button |

---

## 5. State Machine 4: `RecommendedIdea` & `ProjectRoadmap` Lifecycle

| Idea Status | Meaning | Allowed Actions |
| :--- | :--- | :--- |
| `GENERATED` | Newly produced by a recommendation run | View breakdown, Shortlist, Dismiss, Compare |
| `SHORTLISTED` | Saved by student as a top contender | Generate/View Roadmap, Send Supervision Request, Unshortlist |
| `SUPERVISOR_LOCKED` | Supervisor accepted request for this idea | Active FYP Plan; edit milestone progress; export Proposal Brief & Roadmap |
| `DISMISSED` | Hidden by student (logged to refine future diversity) | Restore from archive |

### Roadmap Calibration Logic
When `generateProjectRoadmap` runs for an idea:
1. Calculates `prepWeeks = ceil(totalSkillGapHours / (weeklyHours * 0.7))`, capped at `25%` of `durationWeeks` (minimum `1` week, maximum `6` weeks).
2. Allocates remaining weeks across 4 mandatory phases:
   - **Phase 1: Skill Ramp-Up & Specification** (`prepWeeks`)
   - **Phase 2: Core Architecture & Vertical Slice** (`40%` of remaining weeks)
   - **Phase 3: Feature Completion, AI/Data Integration & Hardening** (`35%` of remaining weeks)
   - **Phase 4: Evaluation, Testing, Documentation & Defense Prep** (`25%` of remaining weeks)
3. Validates that `sum(phase.weeks) === durationWeeks` deterministically before persisting `RoadmapMilestone` records.

---

## 6. Cold-Start & Zero-Data Workflow Safeguards

| Cold-Start Scenario | System Behavior |
| :--- | :--- |
| **New University / Zero Past FYPs** | Anti-duplicate check runs against Global Curated Seed Catalog + notes `"Department archive empty — similarity checked against general CS catalog only"`; Coordinator dashboard shows guided 3-step archive import CTA. |
| **Zero Supervisors in Department** | Idea recommendations still succeed fully; Supervisor panel displays `"No supervisors onboarded for your department yet"` + recommended supervisor specialization profile student can share with their coordinator. |
| **Student Selects 0 Advanced Skills (All Beginner)** | Feasibility engine caps recommended complexity at `MODERATE`, emphasizes structured scaffolding stacks, and allocates max safe `prepWeeks` in the roadmap. |
| **Student Requests Idea Already Done Last Year (`sim >= 0.82`)** | Idea is flagged with `HIGH_DUPLICATE_RISK` badge, displays the matched past project title & year, and enforces a concrete differentiation angle (e.g., new domain dataset, architecture upgrade, or novel evaluation metric). |
