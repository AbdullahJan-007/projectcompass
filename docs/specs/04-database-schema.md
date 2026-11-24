# 04 — Database Schema & `pgvector` Specification

**Project:** ProjectCompass — AI-Powered FYP Idea & Supervisor Recommendation System  
**Author:** Abdullah Jan  
**Document Coverage:** Section 12 (Complete Prisma Schema, `pgvector` HNSW Indexes, Supabase Pooling Rules, Seed Data Contract)

---

## 1. Database Architecture Rules (Supabase PostgreSQL + Prisma ORM)

1. **Single Data-Access Owner:** Prisma ORM is the ONLY data-access layer. Never install `@supabase/supabase-js` for database queries.
2. **Vercel Serverless Connection Pooling:**
   - `DATABASE_URL` points to Supabase's **Transaction Pooler** (port `6543`, `?pgbouncer=true&connection_limit=1`) for runtime queries in Vercel serverless functions.
   - `DIRECT_URL` points to Supabase's **Direct Connection** (port `5432`) strictly for `prisma migrate deploy` and `prisma db push`.
   - Before writing `prisma.config.ts` or `datasource db` syntax, verify the latest stable Prisma documentation for multi-URL configuration (`directUrl` vs. `prisma.config.ts`).
3. **`pgvector` Strategy:** All semantic embeddings use `vector(1536)` (matching OpenAI `text-embedding-3-small` or compatible 1536-dim models) indexed with **HNSW cosine distance** (`vector_cosine_ops`) via custom SQL migration.
4. **FYP-MS Extensibility:** Core institutional entities (`Department`, `Cohort`, `User`, `SupervisorProfile`, `ProjectArchive`) are designed so Phase 2 FYP Management System modules attach via foreign keys without altering existing tables.

---

## 2. Canonical Entity Relationship Overview

| Entity | Primary Purpose | Key Relations |
| :--- | :--- | :--- |
| `Department` | Institutional tenant boundary (e.g., Computer Science, Software Engineering) | Has many `Cohort`, `User`, `SupervisorProfile`, `ProjectArchive` |
| `Cohort` | Academic FYP cycle (e.g., `Fall 2023 - Spring 2024`; one cohort per batch, any number of concurrent batches) | Belongs to `Department`; has many `StudentProfile` |
| `User` | Canonical identity decoupled from Clerk via `clerkId` | Belongs to `Department`; optional 1:1 `StudentAccount`, `FacultyAccount`, `StudentProfile`, or `SupervisorProfile` |
| `StudentAccount` | University Student Registration Number credential schema (`B23F0184CS042`, batch, intake, serial, department, roll no, hashed 4-digit PIN) | 1:1 with `User` (`role = STUDENT`) |
| `FacultyAccount` | University Faculty credential schema (`facultyHandle`, `universityEmail`, `designation`, `departmentCode`, hashed 4-digit PIN) | 1:1 with `User` (`role = SUPERVISOR \| COORDINATOR \| ADMIN`) |
| `Skill` | Normalized canonical skill taxonomy (slug, category, displayName) | Linked via `StudentSkill`, `SupervisorSkill`, `IdeaSkillGap` |
| `StudentProfile` | Student skills, interests, career goal, weekly hours, duration, embedding | Has many `StudentSkill`, `RecommendationRun`, `SupervisorRequest` |
| `SupervisorProfile` | Faculty expertise, research summary embedding, `maxSlots`, `activeSlots`, `isAccepting` | Belongs to `User` & `Department`; has many `SupervisorMatch`, `SupervisorRequest` |
| `ProjectArchive` | Historical university FYP records & PDFs with embeddings for duplicate detection | Belongs to `Department`; indexed with HNSW `pgvector` |
| `SeedIdeaTemplate` | 40+ curated CS/SE project archetypes solving Day-1 cold start | Indexed with HNSW `pgvector`; referenced by `RecommendedIdea` |
| `RecommendationRun` | Immutable audit record of each recommendation execution + profile snapshot hash | Belongs to `StudentProfile`; has 3 `RecommendedIdea` records |
| `RecommendedIdea` | Diversified idea (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`) + 4-factor sub-scores | Has many `IdeaSkillGap`, `SupervisorMatch`, `SupervisorRequest`; optional 1:1 `ProjectRoadmap` |
| `ProjectRoadmap` | Calibrated week-by-week plan tied to a shortlisted/locked idea | Belongs to `RecommendedIdea`; has many `RoadmapMilestone` |
| `MarketTrendSnapshot` | Versioned industry demand & stack insights per CS domain | Updated by scheduled Inngest job |
| `AuditLog` | Immutable trail for coordinator/admin actions & quota overrides | Belongs to actor `User` |

---

## 3. Production Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]
}

enum UserRole {
  STUDENT
  SUPERVISOR
  COORDINATOR
  ADMIN
}

enum SkillProficiency {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum ProjectTrack {
  CORE_SAFE
  CAREER_STRETCH
  RESEARCH_NICHE
}

enum DifficultyLevel {
  MODERATE
  CHALLENGING
  ADVANCED
}

enum DuplicateRiskLevel {
  LOW
  MODERATE
  HIGH
}

enum SkillGapSeverity {
  MINOR
  MODERATE
  CRITICAL
}

enum ProfileStatus {
  DRAFT
  READY
}

enum RunStatus {
  RUNNING
  COMPLETED
  COMPLETED_FALLBACK
  FAILED
}

enum IdeaStatus {
  GENERATED
  SHORTLISTED
  SUPERVISOR_LOCKED
  DISMISSED
}

enum SupervisionRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  WITHDRAWN
  RELEASED
}

enum ArchiveIngestStatus {
  PENDING_EMBEDDING
  PROCESSING
  READY
  NEEDS_MANUAL_ABSTRACT
  FAILED
}

enum MilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

model Department {
  id           String   @id @default(cuid())
  code         String   @unique // e.g., "BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"
  name         String
  university   String
  defaultSlots Int      @default(5)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  cohorts     Cohort[]
  users       User[]
  supervisors SupervisorProfile[]
  archives    ProjectArchive[]

  @@index([code])
}

model Cohort {
  id           String   @id @default(cuid())
  departmentId String
  name         String   // e.g., "FYP 2026-2027"
  startDate    DateTime
  endDate      DateTime
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  department Department       @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  students   StudentProfile[]

  @@unique([departmentId, name])
  @@index([departmentId, isActive])
}

model User {
  id           String   @id @default(cuid())
  clerkId      String?  @unique // Nullable so auth adapter can migrate to Custom JWT seamlessly
  email        String   @unique
  fullName     String
  avatarUrl    String?
  role         UserRole @default(STUDENT)
  departmentId String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  department        Department?        @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  studentAccount    StudentAccount?
  facultyAccount    FacultyAccount?
  studentProfile    StudentProfile?
  supervisorProfile SupervisorProfile?
  uploadedArchives  ProjectArchive[]   @relation("ArchiveUploader")
  auditLogs         AuditLog[]

  @@index([departmentId, role])
}

model StudentAccount {
  id             String   @id @default(cuid())
  userId         String   @unique
  registrationNo String   @unique // e.g., "B23F0184CS042"
  program        String   @default("Bachelor")
  batchYear      Int      // e.g., 2023 (decoded from "B23F...")
  intakeTerm     String   // "Fall" | "Spring"
  serialCode     String   // 4-digit form serial, e.g., "0184"
  departmentCode String   // e.g., "BSCS", "BSSE"
  rollNumber     String   // 3-digit roll no, e.g., "042"
  pinHash        String   // Hashed 4-digit PIN (XXXX)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([departmentCode, batchYear])
}

model FacultyAccount {
  id              String   @id @default(cuid())
  userId          String   @unique
  facultyHandle   String   @unique // e.g., "kamran.siddiqui"
  universityEmail String   @unique // e.g., "kamran.siddiqui@university.edu"
  designation     String   @default("Assistant Professor")
  departmentCode  String   // e.g., "BSCS"
  pinHash         String   // Hashed 4-digit PIN (XXXX)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([departmentCode])
}

model Skill {
  id          String   @id @default(cuid())
  slug        String   @unique // lowercase canonical key, e.g., "nextjs", "postgresql"
  displayName String
  category    String   // e.g., "Frontend", "Backend", "AI/ML", "Data", "DevOps", "Security"
  createdAt   DateTime @default(now())

  studentSkills    StudentSkill[]
  supervisorSkills SupervisorSkill[]
  ideaSkillGaps    IdeaSkillGap[]

  @@index([category])
}

model StudentProfile {
  id                String                       @id @default(cuid())
  userId            String                       @unique
  cohortId          String?
  status            ProfileStatus                @default(DRAFT)
  interests         String[]                     // Canonical domain slugs
  careerGoal        String                       @default("")
  preferredType     String                       @default("PRODUCT_SAAS") // PRODUCT_SAAS | APPLIED_AI | RESEARCH | SYSTEMS
  weeklyHours       Int                          @default(15)
  durationWeeks     Int                          @default(24)
  teamSize          Int                          @default(2)
  gpaBand           String?                      // Optional: e.g., "3.0-3.5"
  profileSummaryTxt String?
  profileEmbedding  Unsupported("vector(1536)")?
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt

  user                User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  cohort              Cohort?              @relation(fields: [cohortId], references: [id], onDelete: SetNull)
  skills              StudentSkill[]
  recommendationRuns  RecommendationRun[]
  supervisionRequests SupervisorRequest[]

  @@index([cohortId, status])
}

model StudentSkill {
  id               String           @id @default(cuid())
  studentProfileId String
  skillId          String
  proficiency      SkillProficiency @default(INTERMEDIATE)
  createdAt        DateTime         @default(now())

  studentProfile StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  skill          Skill          @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([studentProfileId, skillId])
}

model SupervisorProfile {
  id                String                       @id @default(cuid())
  userId            String                       @unique
  departmentId      String
  title             String                       // e.g., "Assistant Professor"
  researchDomains   String[]
  bio               String
  preferredStacks   String[]
  maxSlots          Int                          @default(5)
  activeSlots       Int                          @default(0)
  isAccepting       Boolean                      @default(true)
  profileEmbedding  Unsupported("vector(1536)")?
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt

  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  department          Department          @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  skills              SupervisorSkill[]
  supervisorMatches   SupervisorMatch[]
  supervisionRequests SupervisorRequest[]

  @@index([departmentId, isAccepting, activeSlots])
}

model SupervisorSkill {
  id                  String   @id @default(cuid())
  supervisorProfileId String
  skillId             String
  createdAt           DateTime @default(now())

  supervisorProfile SupervisorProfile @relation(fields: [supervisorProfileId], references: [id], onDelete: Cascade)
  skill             Skill             @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([supervisorProfileId, skillId])
}

model SeedIdeaTemplate {
  id                         String                       @id @default(cuid())
  slug                       String                       @unique
  title                      String
  domain                     String                       // e.g., "EdTech", "HealthTech", "FinTech", "DevTools", "Cybersecurity"
  problemSummary             String
  coreDeliverable            String
  requiredSkillSlugs         String[]
  recommendedStack           String[]
  difficulty                 DifficultyLevel
  baseEffortHours            Int                          // Expected solo-equivalent effort hours
  publicDatasetAvailable     Boolean                      @default(true)
  standardHardwareSufficient Boolean                      @default(true)
  noPaidApiLockin            Boolean                      @default(true)
  careerTracks               String[]
  embedding                  Unsupported("vector(1536)")?
  isActive                   Boolean                      @default(true)
  createdAt                  DateTime                     @default(now())
  updatedAt                  DateTime                     @updatedAt

  recommendedIdeas RecommendedIdea[]

  @@index([domain, difficulty, isActive])
}

model ProjectArchive {
  id                String                       @id @default(cuid())
  departmentId      String
  uploadedById      String?
  title             String
  abstract          String
  academicYear      Int                          // e.g., 2025
  domain            String
  techStack         String[]
  sourceFileUrl     String?                      // UploadThing URL if PDF uploaded
  ingestStatus      ArchiveIngestStatus          @default(PENDING_EMBEDDING)
  ingestError       String?
  embedding         Unsupported("vector(1536)")?
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt

  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  uploadedBy User?      @relation("ArchiveUploader", fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([departmentId, ingestStatus, academicYear])
}

model RecommendationRun {
  id                  String    @id @default(cuid())
  studentProfileId    String
  status              RunStatus @default(RUNNING)
  profileSnapshotHash String
  modelUsed           String?
  promptTokens        Int       @default(0)
  completionTokens    Int       @default(0)
  durationMs          Int?
  usedFallback        Boolean   @default(false)
  errorCode           String?
  createdAt           DateTime  @default(now())
  completedAt         DateTime?

  studentProfile StudentProfile    @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  ideas          RecommendedIdea[]

  @@index([studentProfileId, createdAt])
}

model RecommendedIdea {
  id                       String             @id @default(cuid())
  runId                    String
  seedTemplateId           String?
  track                    ProjectTrack
  status                   IdeaStatus         @default(GENERATED)
  title                    String
  problemStatement         String
  proposedSolution         String
  differentiationAngle     String?            // Mandatory when duplicateRisk == HIGH
  difficulty               DifficultyLevel
  recommendedStack         Json               // Array<{ layer: string; tech: string; rationale: string }>
  feasibilityScore         Int                // 0..100 exact sum of sub-scores
  skillOverlapScore        Int                // 0..40
  timeFitScore             Int                // 0..30
  resourceReadinessScore   Int                // 0..20
  supervisorFitScore       Int                // 0..10
  feasibilityExplanation   String
  duplicateRisk            DuplicateRiskLevel @default(LOW)
  highestArchiveSimilarity Float              @default(0)
  similarArchivesJson      Json               // Array<{ archiveId, title, academicYear, similarity }>
  marketDemandTag          String
  estimatedTotalHours      Int
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt

  run                 RecommendationRun   @relation(fields: [runId], references: [id], onDelete: Cascade)
  seedTemplate        SeedIdeaTemplate?   @relation(fields: [seedTemplateId], references: [id], onDelete: SetNull)
  skillGaps           IdeaSkillGap[]
  supervisorMatches   SupervisorMatch[]
  supervisionRequests SupervisorRequest[]
  roadmap             ProjectRoadmap?

  @@index([runId, track])
  @@index([status])
}

model IdeaSkillGap {
  id                   String           @id @default(cuid())
  recommendedIdeaId    String
  skillId              String
  requiredProficiency  SkillProficiency
  currentProficiency   SkillProficiency?
  severity             SkillGapSeverity
  estimatedLearnHours  Int
  learningAction       String

  recommendedIdea RecommendedIdea @relation(fields: [recommendedIdeaId], references: [id], onDelete: Cascade)
  skill           Skill           @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([recommendedIdeaId, skillId])
}

model SupervisorMatch {
  id                  String   @id @default(cuid())
  recommendedIdeaId   String
  supervisorProfileId String
  rank                Int
  matchPercentage     Int      // 0..100
  sharedKeywords      String[]
  availabilityAtMatch Int      // Snapshot of open slots at recommendation time
  rationale           String

  recommendedIdea   RecommendedIdea   @relation(fields: [recommendedIdeaId], references: [id], onDelete: Cascade)
  supervisorProfile SupervisorProfile @relation(fields: [supervisorProfileId], references: [id], onDelete: Cascade)

  @@unique([recommendedIdeaId, supervisorProfileId])
  @@index([recommendedIdeaId, rank])
}

model SupervisorRequest {
  id                  String                   @id @default(cuid())
  studentProfileId    String
  recommendedIdeaId   String
  supervisorProfileId String
  status              SupervisionRequestStatus @default(PENDING)
  studentPitch        String
  supervisorNote      String?
  createdAt           DateTime                 @default(now())
  respondedAt         DateTime?
  updatedAt           DateTime                 @updatedAt

  studentProfile    StudentProfile    @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  recommendedIdea   RecommendedIdea   @relation(fields: [recommendedIdeaId], references: [id], onDelete: Cascade)
  supervisorProfile SupervisorProfile @relation(fields: [supervisorProfileId], references: [id], onDelete: Cascade)

  @@unique([recommendedIdeaId, supervisorProfileId])
  @@index([supervisorProfileId, status])
  @@index([studentProfileId, status])
}

model ProjectRoadmap {
  id                 String   @id @default(cuid())
  recommendedIdeaId  String   @unique
  durationWeeks      Int
  weeklyHours        Int
  prepWeeksAllocated Int
  summary            String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  recommendedIdea RecommendedIdea    @relation(fields: [recommendedIdeaId], references: [id], onDelete: Cascade)
  milestones      RoadmapMilestone[]
}

model RoadmapMilestone {
  id                   String          @id @default(cuid())
  roadmapId            String
  phaseNumber          Int             // 1..4
  phaseTitle           String
  weekStart            Int
  weekEnd              Int
  title                String
  deliverables         String[]
  verificationCriteria String
  riskNote             String
  status               MilestoneStatus @default(NOT_STARTED)
  sortOrder            Int

  roadmap ProjectRoadmap @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  @@index([roadmapId, sortOrder])
}

model MarketTrendSnapshot {
  id              String   @id @default(cuid())
  domainSlug      String   @unique
  domainName      String
  demandLevel     String   // "HIGH" | "GROWING" | "STEADY" | "NICHE"
  trendDirection  String   // "UP" | "FLAT"
  topTechPairings String[]
  portfolioSignal String   // Concrete hiring/industry explanation
  sourceSummary   String
  versionLabel    String   // e.g., "Current Benchmark" (rolling, not tied to a single cohort)
  refreshedAt     DateTime @default(now())
}

model AuditLog {
  id           String   @id @default(cuid())
  actorUserId  String?
  action       String   // e.g., "SUPERVISOR_SLOT_OVERRIDE", "ARCHIVE_DELETED", "ROLE_UPDATED"
  entityType   String
  entityId     String
  metadataJson Json?
  createdAt    DateTime @default(now())

  actor User? @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 4. Custom SQL Migration for `pgvector` HNSW Indexes & Constraints

Add this SQL inside a dedicated Prisma migration (`prisma/migrations/0002_pgvector_hnsw_and_constraints/migration.sql`):

```sql
-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW cosine-distance indexes for sub-50ms semantic search
CREATE INDEX IF NOT EXISTS idx_seed_idea_embedding_hnsw
  ON "SeedIdeaTemplate" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_project_archive_embedding_hnsw
  ON "ProjectArchive" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_supervisor_profile_embedding_hnsw
  ON "SupervisorProfile" USING hnsw ("profileEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Database-level quota safety invariant (defense in depth alongside atomic transactions)
ALTER TABLE "SupervisorProfile"
  ADD CONSTRAINT chk_supervisor_slots_valid
  CHECK ("activeSlots" >= 0 AND "activeSlots" <= "maxSlots" AND "maxSlots" >= 0);

-- Prevent invalid feasibility sub-score sums or out-of-range values
ALTER TABLE "RecommendedIdea"
  ADD CONSTRAINT chk_feasibility_bounds
  CHECK ("feasibilityScore" >= 0 AND "feasibilityScore" <= 100);
```

---

## 5. Cold-Start Seed Contract (`prisma/seed.ts`)

`prisma/seed.ts` must be idempotent (`upsert` only) and populate:

1. **Department of Information Technology & Computing (6 Programs) & Multi-Batch Cohorts:** `BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS` (stable IDs in `src/lib/auth/university-id.ts` `DEPARTMENT_MAP`), with cohorts derived per batch from each Registration Number (e.g., `B21F`, `B22F`, `B23S`, `B24F`) — no single hardcoded academic year.
2. **60+ Canonical Skills** across 7 categories (`Frontend`, `Backend`, `Database`, `AI/ML`, `Systems/DevOps`, `Cybersecurity`, `Mobile/IoT`).
3. **40+ Curated `SeedIdeaTemplate` Archetypes** spanning non-generic, production-worthy domains (e.g., Distributed Log Anomaly Detector, Clinical Triage Support Workflow, Automated Exam Rubric Grader with Citation Verification, Supply-Chain Cold-Storage IoT Monitor, Static Code Vulnerability Scanner for TypeScript Repos, Accessibility Audit Pipeline for University Portals) — zero basic CRUD clones.
4. **12 `MarketTrendSnapshot` Domain Records** (`Current Benchmark`) with real stack pairings and hiring signals.
5. **5 Realistic Demo Supervisors & 10 Demo Past-FYP Archives** (in non-production / demo seed mode) so local testing and viva demonstrations immediately exercise anti-duplicate warnings and quota-aware matching.
