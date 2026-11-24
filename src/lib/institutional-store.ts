import fs from "fs";
import path from "path";
import {
  DEMO_SUPERVISORS,
  DEMO_PROJECT_ARCHIVES,
  type DemoArchiveSeed,
} from "@/lib/recommendation/seed-data";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";

export interface PersistedStudentSkill {
  skillSlug: string;
  displayName: string;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface PersistedStudentProfile {
  userId: string;
  registrationNo: string;
  fullName: string;
  departmentCode: string;
  status: "DRAFT" | "READY";
  skills: PersistedStudentSkill[];
  interests: string[];
  careerGoal: string;
  preferredType: "PRODUCT_SAAS" | "APPLIED_AI" | "RESEARCH" | "SYSTEMS";
  weeklyHours: number;
  durationWeeks: number;
  teamSize: number;
  gpaBand: string;
  totalEffortHours: number;
  updatedAt: string;
}

export interface PersistedSupervisorRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  title: string;
  departmentCode: string;
  researchDomains: string[];
  bio: string;
  preferredStacks: string[];
  skillSlugs: string[];
  maxSlots: number;
  activeSlots: number;
  isAccepting: boolean;
}

export interface PersistedSupervisionRequest {
  id: string;
  studentUserId: string;
  studentName: string;
  studentRegNo: string;
  supervisorProfileId: string;
  supervisorName: string;
  recommendedIdeaId: string;
  ideaTitle: string;
  track: "CORE_SAFE" | "CAREER_STRETCH" | "RESEARCH_NICHE";
  feasibilityScore: number;
  skillGapsSummary: string;
  studentPitch: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  supervisorNote?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface PersistedArchiveRecord extends DemoArchiveSeed {
  departmentCode: string;
  ingestStatus:
    | "READY"
    | "PENDING_EMBEDDING"
    | "PROCESSING"
    | "NEEDS_MANUAL_ABSTRACT"
    | "FAILED";
  ingestError?: string;
  createdAt: string;
}

export interface PersistedAuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

export interface InstitutionalDatabaseState {
  studentProfiles: Record<string, PersistedStudentProfile>;
  recommendationsByUser: Record<
    string,
    {
      runId: string;
      usedFallback: boolean;
      runsRemainingToday: number;
      shortlistedIds: string[];
      ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord];
      updatedAt: string;
    }
  >;
  milestoneStatuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">;
  supervisors: PersistedSupervisorRecord[];
  supervisionRequests: PersistedSupervisionRequest[];
  archives: PersistedArchiveRecord[];
  auditLogs: PersistedAuditLogRecord[];
}

const DB_FILE_PATH = path.join(process.cwd(), "prisma", "local-institutional-db.json");

const INITIAL_IDEAS_SEED: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord] = [
  {
    id: "cm0idea_core_safe_1",
    track: "CORE_SAFE",
    seedTemplateId: "cm0seed01cilogtriage00001",
    title: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
    domain: "DevTools",
    problemStatement:
      "CI build failures generate thousands of lines of noisy console logs, forcing developers to manually inspect stack traces and delaying bug triage across pull requests.",
    proposedSolution:
      "GitHub Actions webhook service that parses build logs, clusters recurring failure signatures using vector similarity, and posts root-cause PR diffs with benchmarked precision.",
    differentiationAngle:
      "Advances beyond Automated Server Log Visualizer (BSCS 2024 — 84% similarity) by introducing automated failure-trace clustering, GitHub PR commit attribution, and reproducible F1 benchmarks on open-source build logs.",
    difficulty: "MODERATE",
    recommendedStack: [
      {
        layer: "Web Application",
        tech: "Next.js + TypeScript",
        rationale: "Server-rendered diff inspection and type-safe API boundaries.",
      },
      {
        layer: "Webhook Ingestion",
        tech: "Node.js + Inngest",
        rationale: "Processes large GitHub Actions log artifacts asynchronously.",
      },
      {
        layer: "Database & Search",
        tech: "PostgreSQL 16 + pgvector",
        rationale: "Stores build history and indexes 1536-dim failure trace embeddings.",
      },
      {
        layer: "Evaluation Suite",
        tech: "Vitest Benchmark Runner",
        rationale: "Measures clustering precision against labeled failure datasets.",
      },
    ],
    feasibilityScore: 84,
    skillOverlapScore: 34,
    timeFitScore: 26,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Strong match with your TypeScript, Next.js, and PostgreSQL experience. Fits comfortably within a 594-hour two-student semester budget with 22 hours of initial prep.",
    duplicateRisk: "HIGH",
    highestArchiveSimilarity: 0.84,
    similarArchives: [
      {
        archiveId: "cm0arch01logvisualizer001",
        title: "Automated Server Log Visualizer and CI Failure Dashboard",
        academicYear: 2024,
        similarity: 0.84,
      },
    ],
    marketDemandTag: "DevTools · High Industry Demand",
    estimatedTotalHours: 340,
    skillGaps: [
      {
        skillSlug: "pgvector",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: "BEGINNER",
        severity: "MINOR",
        estimatedLearnHours: 10,
        learningAction:
          "Practice HNSW cosine distance indexing and similarity threshold tuning in PostgreSQL.",
      },
      {
        skillSlug: "github-actions",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 12,
        learningAction:
          "Build a small webhook listener that verifies GitHub HMAC signatures and downloads workflow logs.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup01kamransiddiqui001",
        fullName: "Dr. Kamran Siddiqui",
        title: "Associate Professor",
        rank: 1,
        matchPercentage: 88,
        sharedKeywords: ["DevTools", "typescript", "nodejs", "postgresql"],
        availabilityAtMatch: 3,
        maxSlots: 5,
        activeSlots: 2,
        rationale:
          "Supervises software testing and CI reliability projects; 3 of 5 slots available.",
      },
      {
        supervisorProfileId: "cm0sup03farhanqureshi0003",
        fullName: "Dr. Farhan Qureshi",
        title: "Assistant Professor",
        rank: 2,
        matchPercentage: 79,
        sharedKeywords: ["DevTools", "typescript"],
        availabilityAtMatch: 4,
        maxSlots: 5,
        activeSlots: 1,
        rationale:
          "Supervises static analysis and developer tooling; 4 of 5 slots available.",
      },
    ],
  },
  {
    id: "cm0idea_career_stretch_2",
    track: "CAREER_STRETCH",
    seedTemplateId: "cm0seed35llmcostgateway35",
    title: "Multi-Provider AI Gateway with pgvector Semantic Caching & Token Quotas",
    domain: "Applied AI",
    problemStatement:
      "Engineering teams integrating language models face high API costs on repeated queries and service interruptions when a single provider throttles traffic.",
    proposedSolution:
      "OpenAI-compatible proxy gateway with cosine-threshold semantic caching in PostgreSQL, automatic provider failover, and per-project token budgets.",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [
      {
        layer: "Gateway Router",
        tech: "Next.js + Node.js Streams",
        rationale: "Low-latency request forwarding and token accounting.",
      },
      {
        layer: "Semantic Cache",
        tech: "PostgreSQL + pgvector",
        rationale: "Sub-25ms cosine lookup for semantically identical prompts.",
      },
      {
        layer: "Provider Layer",
        tech: "Vercel AI SDK + Zod",
        rationale: "Structured fallback across compatible model endpoints.",
      },
      {
        layer: "Quota Ledger",
        tech: "Prisma ORM",
        rationale: "Transactional tracking of token consumption per project.",
      },
    ],
    feasibilityScore: 79,
    skillOverlapScore: 31,
    timeFitScore: 24,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Aligns with your target career path in Full-Stack & AI Systems. Requires 24 hours of focused preparation on semantic cache benchmarking.",
    duplicateRisk: "MODERATE",
    highestArchiveSimilarity: 0.75,
    similarArchives: [
      {
        archiveId: "cm0arch02examchatbot00002",
        title: "University Course Material Q&A Assistant Using Vector Search",
        academicYear: 2025,
        similarity: 0.75,
      },
    ],
    marketDemandTag: "Applied AI · High Industry Demand",
    estimatedTotalHours: 385,
    skillGaps: [
      {
        skillSlug: "llm-evaluation",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 14,
        learningAction:
          "Design cache hit/miss accuracy evaluations and false-positive similarity tests.",
      },
      {
        skillSlug: "pgvector",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: "BEGINNER",
        severity: "MINOR",
        estimatedLearnHours: 10,
        learningAction: "Benchmark HNSW index latency on 10,000 cached prompt embeddings.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup02ayesharehman00002",
        fullName: "Dr. Ayesha Rehman",
        title: "Associate Professor",
        rank: 1,
        matchPercentage: 86,
        sharedKeywords: ["Applied AI", "pgvector", "llm-evaluation"],
        availabilityAtMatch: 2,
        maxSlots: 5,
        activeSlots: 3,
        rationale:
          "Leads retrieval systems and AI evaluation research; 2 of 5 slots available.",
      },
    ],
  },
  {
    id: "cm0idea_research_niche_3",
    track: "RESEARCH_NICHE",
    seedTemplateId: "cm0seed08sbomguard0000008",
    title: "Reachability-Aware SBOM & Transitive Dependency Vulnerability Verifier",
    domain: "Cybersecurity",
    problemStatement:
      "Standard dependency audit tools report hundreds of CVE warnings even when the vulnerable function is never called by the application.",
    proposedSolution:
      "Static call-graph analyzer that cross-references CycloneDX SBOM advisories against imported TypeScript symbols to prioritize reachable vulnerabilities.",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [
      {
        layer: "Call-Graph Analyzer",
        tech: "TypeScript Compiler AST API",
        rationale: "Traces function imports and execution paths across packages.",
      },
      {
        layer: "Advisory Parser",
        tech: "CycloneDX + OSV Schema",
        rationale: "Parses open vulnerability feeds and affected function metadata.",
      },
      {
        layer: "Data Store",
        tech: "PostgreSQL + Prisma",
        rationale: "Persists scan reports, reachability proofs, and remediation diffs.",
      },
      {
        layer: "Inspection UI",
        tech: "Next.js + Tailwind CSS",
        rationale: "Visualizes dependency call chains and false-positive reduction.",
      },
    ],
    feasibilityScore: 74,
    skillOverlapScore: 24,
    timeFitScore: 22,
    resourceReadinessScore: 20,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Distinct research direction in software supply-chain security. Includes 32 hours of structured ramp-up for AST parsing and SBOM specifications.",
    duplicateRisk: "LOW",
    highestArchiveSimilarity: 0.58,
    similarArchives: [
      {
        archiveId: "cm0arch04vulnheaderscan04",
        title: "Web Application HTTP Security Header and OWASP Checklist Scanner",
        academicYear: 2023,
        similarity: 0.58,
      },
    ],
    marketDemandTag: "Cybersecurity · High Industry Demand",
    estimatedTotalHours: 410,
    skillGaps: [
      {
        skillSlug: "sbom-supply-chain",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "CRITICAL",
        estimatedLearnHours: 18,
        learningAction: "Review CycloneDX 1.5 specification and OSV advisory schema.",
      },
      {
        skillSlug: "ast-parsing",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 14,
        learningAction: "Write a TypeScript compiler AST visitor to map imported symbols.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup03farhanqureshi0003",
        fullName: "Dr. Farhan Qureshi",
        title: "Assistant Professor",
        rank: 1,
        matchPercentage: 87,
        sharedKeywords: ["Cybersecurity", "sbom-supply-chain", "ast-parsing"],
        availabilityAtMatch: 4,
        maxSlots: 5,
        activeSlots: 1,
        rationale:
          "Researches static vulnerability analysis and SBOM verification; 4 of 5 slots available.",
      },
    ],
  },
];

function createDefaultInstitutionalState(): InstitutionalDatabaseState {
  const defaultProfile: PersistedStudentProfile = {
    userId: "cm0userstudent00000000001",
    registrationNo: "B23F0184CS042",
    fullName: "Areeba Noor",
    departmentCode: "BSCS",
    status: "READY",
    skills: [
      { skillSlug: "typescript", displayName: "TypeScript", proficiency: "ADVANCED" },
      { skillSlug: "nextjs", displayName: "Next.js", proficiency: "INTERMEDIATE" },
      { skillSlug: "postgresql", displayName: "PostgreSQL", proficiency: "INTERMEDIATE" },
      {
        skillSlug: "pgvector",
        displayName: "pgvector Semantic Search",
        proficiency: "BEGINNER",
      },
    ],
    interests: ["DevTools", "Applied AI"],
    careerGoal: "Full-Stack & AI Systems Engineer",
    preferredType: "PRODUCT_SAAS",
    weeklyHours: 15,
    durationWeeks: 24,
    teamSize: 2,
    gpaBand: "3.4 - 3.8",
    totalEffortHours: 594,
    updatedAt: "2026-11-23T09:00:00.000Z",
  };

  return {
    studentProfiles: {
      cm0userstudent00000000001: defaultProfile,
    },
    recommendationsByUser: {
      cm0userstudent00000000001: {
        runId: "cm0run_initial_01",
        usedFallback: false,
        runsRemainingToday: 4,
        shortlistedIds: ["cm0idea_core_safe_1"],
        ideas: INITIAL_IDEAS_SEED,
        updatedAt: "2026-11-23T09:05:00.000Z",
      },
    },
    milestoneStatuses: {
      ms_phase_1_rampup: "COMPLETED",
      ms_phase_2_vertical_slice: "IN_PROGRESS",
      ms_phase_3_hardening: "NOT_STARTED",
      ms_phase_4_defense: "NOT_STARTED",
    },
    supervisors: DEMO_SUPERVISORS.map((s) => ({
      ...s,
      departmentCode: "BSCS",
    })),
    supervisionRequests: [
      {
        id: "cm0req01studentpitch00001",
        studentUserId: "cm0userstudent00000000001",
        studentName: "Areeba Noor",
        studentRegNo: "B23F0184CS042",
        supervisorProfileId: "cm0sup01kamransiddiqui001",
        supervisorName: "Dr. Kamran Siddiqui",
        recommendedIdeaId: "cm0idea_core_safe_1",
        ideaTitle: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
        track: "CORE_SAFE",
        feasibilityScore: 84,
        skillGapsSummary: "pgvector (10h), github-actions (12h)",
        studentPitch:
          "We have built a working TypeScript and PostgreSQL log parser prototype and would like to evaluate failure clustering on GitHub Actions build logs under your supervision.",
        status: "PENDING",
        createdAt: "2026-11-23T09:30:00.000Z",
      },
    ],
    archives: [
      ...DEMO_PROJECT_ARCHIVES.map((a) => ({
        ...a,
        departmentCode: "BSCS",
        ingestStatus: "READY" as const,
        createdAt: "2026-09-15T10:00:00.000Z",
      })),
      {
        id: "cm0arch11scannedpdf000011",
        title: "Campus Wi-Fi Rogue Access Point Detection Utility",
        abstract: "Scanned PDF uploaded without extractable text layer.",
        academicYear: 2022,
        domain: "Cybersecurity",
        techStack: ["Python", "Wireshark", "Linux"],
        departmentCode: "BSCS",
        ingestStatus: "NEEDS_MANUAL_ABSTRACT",
        ingestError:
          "Abstract is under 100 characters (scanned PDF). Paste the project abstract below to complete indexing.",
        createdAt: "2026-10-01T11:20:00.000Z",
      },
    ],
    auditLogs: [
      {
        id: "cm0audit_1",
        timestamp: "2026-11-23 09:15",
        actor: "Prof. Dr. Naveed Ahmad",
        action: "COHORT_OPENED",
        entityType: "Cohort",
        entityId: "FYP-2026-2027",
        summary: "Opened Fall 2026 – Spring 2027 FYP cycle for Department of Computer Science (BSCS).",
      },
      {
        id: "cm0audit_2",
        timestamp: "2026-11-23 11:42",
        actor: "Dr. Salman Raza",
        action: "ARCHIVE_INDEXED",
        entityType: "ProjectArchive",
        entityId: "BSCS-2023-2025",
        summary: "Indexed 10 past BSCS final-year project abstracts for duplicate similarity checks.",
      },
    ],
  };
}

export function readInstitutionalDb(): InstitutionalDatabaseState {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initial = createDefaultInstitutionalState();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<InstitutionalDatabaseState>;
    const defaults = createDefaultInstitutionalState();
    return {
      studentProfiles: parsed.studentProfiles ?? defaults.studentProfiles,
      recommendationsByUser:
        parsed.recommendationsByUser ?? defaults.recommendationsByUser,
      milestoneStatuses: parsed.milestoneStatuses ?? defaults.milestoneStatuses,
      supervisors: Array.isArray(parsed.supervisors)
        ? parsed.supervisors
        : defaults.supervisors,
      supervisionRequests: Array.isArray(parsed.supervisionRequests)
        ? parsed.supervisionRequests
        : defaults.supervisionRequests,
      archives: Array.isArray(parsed.archives) ? parsed.archives : defaults.archives,
      auditLogs: Array.isArray(parsed.auditLogs)
        ? parsed.auditLogs
        : defaults.auditLogs,
    };
  } catch {
    return createDefaultInstitutionalState();
  }
}

export function writeInstitutionalDb(state: InstitutionalDatabaseState): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Ignore write failure on read-only fs
  }
}
