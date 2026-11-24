# 01 — Product Brief & Requirements Specification

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Sections 1–10 (Executive Summary through Non-Functional Requirements) and Section 23 (MVP Definition)

---

## 1. Executive Summary

ProjectCompass is a full-stack academic decision-support platform designed to solve Final-Year Project (FYP) ideation, feasibility validation, and supervisor matching for university computer science and engineering departments. Built as a standalone-deployable product with modular schemas ready to plug into a full FYP Management System (FYP-MS), ProjectCompass replaces ad-hoc student brainstorming and manual coordinator spreadsheets with an auditable, hybrid recommendation engine.

Unlike generic LLM chat wrappers, ProjectCompass treats AI as a structured workflow assistant layered on top of deterministic engineering constraints: supervisor capacity quotas, department past-project archives indexed with `pgvector`, explicit multi-factor feasibility math, and diversity-enforced ranking.

---

## 2. Problem Statement

University seniors and FYP committees consistently encounter five structural breakdowns during project selection:

1. **Generic & Saturated Ideas:** Students default to overused templates (basic e-commerce websites, static hospital/library CRUD systems) that fail FYP panel innovation rubrics and add weak portfolio value.
2. **Unrealistic Scope & Mid-Semester Collapse:** Students select trendy topics (e.g., training foundation LLMs from scratch or multi-drone autonomous fleets) without verifying whether their current skills, hardware, datasets, and 24-week timeline can deliver a working system.
3. **Zero Institutional Memory:** Departments lack automated similarity checks against prior cohorts' archived FYPs, leading to accidental duplication and wasted proposal review cycles.
4. **Broken Supervisor Matching:** Popular faculty members receive 3x–4x more inquiries than their supervision quota allows, while qualified supervisors with open slots and exact domain expertise go unnoticed.
5. **No Execution Bridge:** Even when an idea is approved, students lack a realistic skill-gap remediation plan and milestone roadmap calibrated to their actual weekly availability.

---

## 3. Target Users

| User Segment | Primary Goal | Key Pain Point Today |
| :--- | :--- | :--- |
| **Final-Year Students** | Discover a feasible, original, career-aligned FYP idea with an available supervisor and actionable execution plan. | Paralysis between boring CRUD projects and impossible AI/distributed-systems hype; repeated proposal rejections. |
| **Faculty Supervisors** | Mentor well-scoped projects aligned with their research labs without exceeding slot limits. | Flooded with off-topic student emails and poorly scoped one-paragraph proposals. |
| **FYP Coordinators** | Maintain archive quality, eliminate duplicate projects, enforce supervisor load balance, and monitor cohort readiness. | Manually checking past PDFs and tracking supervisor capacity in disconnected Excel sheets. |
| **University Admins** | Configure departments, academic cohorts, policies, and institutional governance across campuses. | Zero visibility into cross-department project trends, faculty utilization, and compliance. |

---

## 4. Core Value Proposition

ProjectCompass delivers **explainable, constraint-aware FYP recommendations** in under 15 seconds:

- **For Students:** Transforms a 3-minute structured profile into 3 diversified, non-duplicate FYP proposals (Core/Safe, Career-Stretch, Research/Niche) complete with an auditable 0–100 Feasibility Score breakdown, explicit skill-gap plan, required tech stack, matched available supervisors, and a week-by-week roadmap.
- **For Supervisors:** Surfaces only skill-vetted, domain-matched student proposals while hard-enforcing supervision quotas.
- **For Departments:** Builds a searchable semantic archive of past FYPs that eliminates duplicate approvals and surfaces live skill/market demand insights.

---

## 5. Exact MVP Scope

The MVP delivers a complete, production-ready vertical slice covering the core student-to-roadmap journey plus essential institutional data management:

1. **Authentication, Separate Student/Faculty Schemas & Role-Based Access Control (RBAC):**
   - **Student Registration Number Login (`StudentAccount` Schema):** Students register and sign in using their official university Registration Number pattern `B[YY][F/S][4-Digits][DEPT][3-Digits]` (e.g., `B23F0184CS042`), which deterministically decodes Program (`Bachelor`), Batch Year (`2023`), Intake Semester (`Fall`/`Spring`), Form Serial (`0184`), Academic Department (`BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`, `BSIT`), and Roll Number (`042`), paired with a SHA-256 hashed 4-digit PIN (`XXXX`).
   - **Faculty Name / Email Login (`FacultyAccount` Schema):** Faculty members register and sign in with their official university email or teacher handle (e.g., `kamran.siddiqui@university.edu`), designation, supervision slot quota, research domains, and 4-digit PIN (`XXXX`).
   - **Unified Auth Adapter:** Abstracted behind `src/lib/auth/session.ts` with HttpOnly session cookies (`projectcompass_uni_session`) and seamless Clerk SSO compatibility supporting Student, Supervisor, FYP Coordinator, and University Admin roles.
2. **Student Skill & Context Profile:** Structured capture of current technical skills with proficiency levels (Beginner, Intermediate, Advanced) from 62 canonical skills + custom skill slugs, domain interests, academic track/GPA band (optional), weekly hours available, team size (1–3), target career role, and preferred project type (Product/SaaS, Research, Applied AI, Systems/DevOps).
3. **Hybrid FYP Idea Recommendation Engine:**
   - Curated Cold-Start Seed Catalog (42 vetted CS/SE/AI/Cybersecurity project archetypes) so Day-1 recommendations are rich even before a university uploads historical archives.
   - 3-track diversified recommendations per run (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`).
   - Transparent **Explainable Feasibility Score (0–100)** broken down into 4 weighted components.
   - **Difficulty Estimation** (`MODERATE`, `CHALLENGING`, `ADVANCED`) and **Required Tech-Stack Suggestions** with rationale.
   - **Skill-Gap Analysis** comparing student proficiency against required project skills, paired with estimated upskilling hours.
   - **Similar-Project Detection** via `pgvector` cosine similarity against archived department FYPs (warning at `>= 0.72`, forced differentiation gate at `>= 0.82`).
4. **Availability-Aware Supervisor Matching:** Ranks department supervisors by research-domain embedding similarity and skill overlap while strictly enforcing `activeSlots < maxSlots`. Students can submit a structured Supervision Interest Request to a matched supervisor.
5. **Personalized Project Roadmap Generator:** Converts any shortlisted/selected FYP idea into a phased, week-by-week execution roadmap (aligned to the student's semester duration, default 24 weeks, and weekly hours) including skill-gap prep weeks, deliverables, risk checkpoints, and Markdown/JSON export.
6. **Market-Trend Insights Panel:** Curated, versioned industry demand snapshots (domain growth, in-demand stack pairings, portfolio impact tags) updated via scheduled Inngest jobs and surfaced alongside recommendations.
7. **Coordinator & Supervisor Portals (MVP Essential):**
   - Supervisors manage research domains, keywords, preferred stacks, availability status, and slot quotas, and respond (Accept/Decline with reason) to incoming student interest requests.
   - FYP Coordinators upload past FYP records (CSV or PDF abstracts via UploadThing -> async Inngest embedding pipeline) and monitor department quota utilization.
   - University Admins manage departments, active cohorts, and role assignments.

---

## 6. Explicit Non-Goals (Out of Scope for MVP)

To prevent scope creep and ensure rock-solid MVP delivery, the following are strictly excluded from MVP:

- Full FYP Lifecycle Grading, Rubrics, External Examiner Scheduling, or Plagiarism Checking of final thesis documents (deferred to Phase 2 FYP-MS modules).
- Real-time student-supervisor chat or video conferencing (email notifications via Resend suffice for MVP).
- Direct LMS/ERP integrations (Moodle, Canvas, university SIS sync — deferred to Post-MVP).
- Automated web scraping of live job boards inside request handlers (market trends use versioned curated/scheduled snapshots).
- Custom fine-tuned self-hosted LLMs (use provider-agnostic OpenAI-compatible APIs via Vercel AI SDK).
- Native mobile apps (iOS/Android — responsive web design covers mobile browsers).
- Multi-currency billing or Stripe subscription checkout (deferred to SaaS commercialization phase).

---

## 7. User Roles & Permissions Matrix (RBAC)

All permissions are enforced server-side inside Server Actions and Route Handlers via `requireRole()` and department/ownership checks.

| Capability / Resource | Student | Supervisor | FYP Coordinator | University Admin |
| :--- | :---: | :---: | :---: | :---: |
| Create / edit own Student Profile | Yes | No | No | Read-only |
| Run FYP Recommendation Engine | Yes (rate-limited) | No | Preview/Test | Preview/Test |
| View explainable scores, skill gaps & roadmaps | Own only | Shared requests | Department only | All departments |
| Shortlist ideas & generate/edit own Roadmap | Yes | Read shared | Read department | Read all |
| Send Supervision Interest Request | Yes (max 3 active) | No | No | No |
| Manage own Supervisor Profile & slot quota | No | Yes (within dept cap) | Override dept | Override all |
| Accept / Decline Supervision Request | No | Own requests | Override dept | Override all |
| Upload & manage Past-FYP Archive records | Read anonymized | Read department | Full CRUD (dept) | Full CRUD (all) |
| View Market-Trend Insights | Read | Read | Read | Read + Refresh |
| Manage Departments, Cohorts & User Roles | No | No | Cohort settings | Full CRUD |
| View Audit Logs & System Health | No | No | Dept audit logs | Full audit logs |

---

## 8. User Stories & Acceptance Criteria

### US-01: Student Builds Skill & Context Profile
- **As a** final-year student, **I want to** enter my technical skills with proficiency levels, domain interests, career goal, team size, and weekly hours, **so that** recommendations match my real capacity.
- **Acceptance Criteria:**
  - Profile cannot trigger recommendations until at least 3 skills, 1 interest domain, weekly hours (`5–45`), and duration (`12–36` weeks) are saved.
  - Skills support autocomplete from canonical taxonomy plus custom skill tags normalized to lowercase slugs.
  - Changes persist immediately via Server Action with Zod validation and optimistic UI feedback.

### US-02: Student Generates Diversified, Explainable FYP Recommendations
- **As a** student, **I want to** receive 3 distinct FYP recommendations with feasibility breakdowns, skill gaps, tech stack suggestions, and past-project similarity warnings, **so that** I can defend my choice to my FYP committee.
- **Acceptance Criteria:**
  - Every recommendation run returns exactly 3 distinct tracks: `CORE_SAFE`, `CAREER_STRETCH`, and `RESEARCH_NICHE`.
  - Feasibility score (`0–100`) displays exact sub-scores (Skill Overlap 40%, Time Fit 30%, Resource Readiness 20%, Supervisor Fit 10%) summing cleanly to the displayed total.
  - Any recommendation with cosine similarity `>= 0.82` to an archived department FYP automatically includes a mandatory `differentiationAngle` and warning badge.
  - If the LLM provider fails or times out, the user receives a deterministic recommendation card synthesized from the top matched seed templates with a non-blocking status notice (zero 500 crash).

### US-03: Student Matches with Available Supervisors
- **As a** student, **I want to** see ranked supervisors whose expertise matches my chosen idea and who actually have open supervision slots, **so that** I don't waste weeks emailing unavailable faculty.
- **Acceptance Criteria:**
  - Supervisors with `isAccepting = false` or `activeSlots >= maxSlots` are excluded from primary recommendations (shown only in an optional collapsed "Full Capacity" list with disabled request button).
  - Each matched supervisor displays match percentage, shared research tags, and exact open slots (e.g., `2 of 5 slots open`).
  - Students can have at most 3 pending supervision requests simultaneously to prevent spamming faculty.

### US-04: Student Generates & Exports Personalized Project Roadmap
- **As a** student, **I want to** generate a week-by-week project roadmap tailored to my skill gaps and semester length, **so that** I know what to build each week from proposal to defense.
- **Acceptance Criteria:**
  - Roadmap phases automatically allocate early ramp-up weeks when `skillGapHours > 15`.
  - Milestones include concrete deliverables, verification criteria, and risk checkpoints.
  - Student can toggle milestone completion status and export the roadmap as clean Markdown.

### US-05: Coordinator Uploads Past FYPs to Strengthen Anti-Duplicate Memory
- **As an** FYP coordinator, **I want to** upload historical FYP abstracts (PDF or CSV batch), **so that** the system detects duplicate ideas and surfaces departmental history.
- **Acceptance Criteria:**
  - Uploading a PDF/CSV returns immediately with `INGESTING` status while Inngest extracts text, generates 1536-dim embeddings, and persists records asynchronously.
  - Failed rows or unreadable PDFs are surfaced in a clear error log with a one-click retry action without crashing the batch.

---

## 9. Functional Requirements

| ID | Category | Requirement |
| :--- | :--- | :--- |
| **FR-01** | Auth & Onboarding | System must authenticate users via Clerk, synchronize user records via verified webhook, and route new users through role-specific onboarding. |
| **FR-02** | Profile Engine | System must store normalized student skills (proficiency 1–3), interests, career goal, team size, semester duration, and weekly hour budget. |
| **FR-03** | Hybrid Matching | System must execute SQL hard filters, `pgvector` cosine similarity across Seed Catalog + Past Archive, deterministic feasibility scoring, and MMR diversity selection. |
| **FR-04** | Anti-Duplicate Gate | System must compare every candidate idea embedding against department `ProjectArchive` embeddings and attach similarity metadata (`topMatches`, `duplicateRiskLevel`). |
| **FR-05** | Skill-Gap Engine | System must compute missing or under-leveled skills per recommended idea, assign severity (`CRITICAL`, `MODERATE`, `MINOR`), and estimate learning hours. |
| **FR-06** | Supervisor Matching | System must rank department supervisors using vector similarity + tag overlap while enforcing `activeSlots < maxSlots` atomically via database transaction on acceptance. |
| **FR-07** | Roadmap Generator | System must generate a structured phased roadmap (Foundation/Upskilling, Core Build, Integration/Testing, Evaluation/Defense) calibrated to `durationWeeks` and `weeklyHours`. |
| **FR-08** | Market Insights | System must expose versioned market-demand indicators (demand tier, trend direction, key tooling) per CS domain and link them to recommended ideas. |
| **FR-09** | Archive Ingestion | System must support single-entry creation, CSV bulk import, and PDF upload (UploadThing + Inngest) into `ProjectArchive` with automatic embedding generation. |
| **FR-10** | Notifications | System must send transactional emails via Resend when a supervision request is submitted, accepted, or declined, and when bulk archive ingestion finishes. |

---

## 10. Non-Functional Requirements

| ID | Quality Attribute | Production Target |
| :--- | :--- | :--- |
| **NFR-01** | Performance (CRUD) | Standard page loads and Server Actions `p95 < 400ms`. |
| **NFR-02** | Performance (Recommendations) | End-to-end hybrid recommendation run (SQL + `pgvector` + LLM synthesis) `p95 < 12s` with progressive UI state updates; deterministic fallback `< 2s`. |
| **NFR-03** | Availability & Resilience | Target `99.5%` uptime on Vercel + Supabase; zero hard dependency on LLM uptime (deterministic fallback active). |
| **NFR-04** | Security & Isolation | Zero client-trusted role checks; strict department scoping; webhook HMAC signature verification; Zod validation on 100% of external and internal inputs. |
| **NFR-05** | Accessibility (WCAG) | Strict **WCAG 2.1 Level AA** color contrast (`>= 4.5:1` normal text, `>= 3:1` UI components), full keyboard navigation, semantic ARIA labels via shadcn/ui/Radix primitives. |
| **NFR-06** | Scalability | Supports up to `10,000` active students and `50,000` archived FYP vectors via PostgreSQL HNSW indexing without architectural changes. |
| **NFR-07** | Maintainability | TypeScript `strict: true`, zero `any`, modular feature directories, automated CI checks (typecheck + lint + Vitest + Playwright smoke tests). |
| **NFR-08** | Observability | Structured JSON logs with correlation IDs, Sentry exception capture on server/client, PostHog product telemetry without leaking PII. |

---

## 23. MVP Definition of Done

The MVP is considered **Production-Ready & Shippable** when all 8 criteria below pass verification:

1. A student can sign up, complete their skill/interest profile, run the recommendation engine, inspect 3 diversified ideas with transparent 4-factor feasibility scores and skill-gap breakdowns, view matched available supervisors, submit a supervision request, and generate/export a week-by-week roadmap.
2. A supervisor can update their research profile and slot limit, receive email + dashboard notification of a student request, and accept/decline it with atomic slot decrement/increment protection against race conditions.
3. An FYP coordinator can upload past FYPs (manual, CSV, or PDF), see async embedding status transition to `READY`, and verify that submitting a matching student profile triggers the anti-duplicate similarity warning (`>= 0.82`).
4. Cold-start works out of the box: a brand-new department with zero uploaded past FYPs still produces high-quality, non-generic recommendations from the seeded 40+ CS archetype catalog.
5. Disconnecting or invalidating the LLM API key gracefully triggers the deterministic fallback engine without crashing the UI.
6. All unit tests for feasibility math, MMR diversity ranking, duplicate threshold detection, and quota transactions pass in Vitest.
7. Playwright E2E tests verify Student onboarding -> recommendation -> roadmap flow and RBAC denial (Student attempting Coordinator/Admin routes).
8. Deployed live on Vercel + Supabase PostgreSQL (`pgvector`) with zero TypeScript errors, zero ESLint errors, and verified WCAG AA light-theme UI.

---

## Assumptions, Decisions & Recommendations

- **Assumptions:** Universities have at least one FYP coordinator per department who maintains supervisor slot limits each semester; students have stable browser access and university or personal email addresses.
- **Locked Decisions:** Single-database relational + vector design (`Supabase PostgreSQL + pgvector` via Prisma); Next.js Server Actions for internal mutations and Route Handlers strictly for webhooks; Clerk behind an auth adapter for Day-1 velocity with zero vendor lock-in; Inngest for serverless-safe async jobs; light-theme WCAG AA design system.
- **Recommendations for Rollout:** Seed the system with 1–2 real past cohorts from the host university before pilot launch so students immediately experience live institutional duplicate detection during demo and FYP defense.
